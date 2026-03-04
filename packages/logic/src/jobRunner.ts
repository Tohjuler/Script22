import { db } from "@script22/db";
import {
	decryptSecret,
	getDecryptedCredential,
} from "@script22/db/credentialUtils";
import { type SshCredentialKind, Tables } from "@script22/db/schema/main";
import { YAML } from "bun";
import { eq } from "drizzle-orm";
import { Client } from "ssh2";
import { getSetting } from "./settings";
import { jobConfig } from "./types";

type ExecResult = {
	status: number;
	stdout: string;
	stderr: string;
};

export default async function runJob(
	serverId: number,
	jobId: number,
): Promise<number> {
	const server = await db.query.server.findFirst({
		where: (table, { eq }) => eq(table.id, serverId),
	});
	if (!server) throw new Error("Server not found");

	const job = await db.query.job.findFirst({
		where: (table, { eq }) => eq(table.id, jobId),
	});
	if (!job) throw new Error("Job not found");

	const config = jobConfig.parse(YAML.parse(job.config));
	if (!config.commands || config.commands.length === 0)
		throw new Error("No commands to run");

	// ---

	const runId = await db
		.insert(Tables.jobRun)
		.values({
			jobId: jobId,
			serverId: serverId,
			state: "running",
		})
		.returning({ id: Tables.jobRun.id })
		.then((rows) => rows[0]?.id);
	if (!runId) throw new Error("Failed to create job run record");

	const finish = async (state: string, output: ExecResult[]) => {
		await db
			.update(Tables.jobRun)
			.set({
				state: state,
				output: JSON.stringify(output),
				finishedAt: new Date(),
			})
			.where(eq(Tables.jobRun.id, runId))
			.catch((err) => {
				console.error("Error updating job run record:", err);
			});
	};

	const auth = server.credentialId
		? await getDecryptedCredential(server.credentialId)
		: null;

	const defaultAuth = !auth ? await getDefaultAuth() : null;

	if (!auth && !defaultAuth) {
		finish("failed", [
			{
				status: -1,
				stdout: "",
				stderr: "No authentication method available for this server",
			},
		]);
		return runId;
	}

	const sshKey =
		auth?.kind === "private_key" ? auth.secret : (defaultAuth?.private_key || undefined);
	const sshPassword =
		auth?.kind === "password" ? auth.secret : (defaultAuth?.password || undefined);

	try {
		const conn = new Client();
		conn
			.on("ready", () => {
				console.debug("SSH Connection ready", {
					serverId: serverId,
					jobId: jobId,
				});
				let currentCommandIndex = 0;
				const commandOutputs: ExecResult[] = [];
				const callback = (result: ExecResult) => {
					if (result.status !== 0 && !config.continueOnFailure) {
						console.error("Command failed, aborting further execution", result);
						finish("failed", commandOutputs.concat(result));
						conn.end();
						return;
					}
					console.debug("Command execution result", result);

					if (currentCommandIndex + 1 < config.commands.length) {
						currentCommandIndex++;
						commandOutputs.push(result);
						execCommand(conn, config.commands[currentCommandIndex], callback);
					} else {
						console.debug("All commands executed");
						finish("succeeded", commandOutputs.concat(result));
						conn.end();
					}
				};
				execCommand(conn, config.commands[0] || "", callback);
			})
			.on("error", (err) => {
				console.error("SSH Connection error", err);
				finish("failed", [
					{
						status: -1,
						stdout: "",
						stderr: `SSH connection error: ${err.message}`,
					},
				]);
			})
			.connect({
				host: server.host,
				port: server.port,
				username: server.username,

				privateKey: sshKey,
				password: sshPassword,
			});
	} catch (err) {
		console.error("Unexpected error during job execution", err);
		await finish("failed", [
			{
				status: -1,
				stdout: "",
				stderr: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
			},
		]);
	}

	return runId;
}

function execCommand(
	conn: Client,
	command: string | undefined,
	next: (res: ExecResult) => void,
) {
	if (!command) throw new Error("No command provided");

	console.debug(`Executing command: ${command}`);
	conn.exec(command, (err, stream) => {
		if (err) throw err;
		let stdout = "";
		let stderr = "";
		stream
			.on("close", (code: number, signal: string) => {
				console.debug(
					`Command "${command}" finished with code ${code}, signal ${signal}`,
				);
				next({ status: code, stdout, stderr });
			})
			.on("data", (data: Buffer) => {
				console.debug(`STDOUT: ${data.toString()}`);
				stdout += data.toString();
			})
			.stderr.on("data", (data: Buffer) => {
				console.debug(`STDERR: ${data.toString()}`);
				stderr += data.toString();
			});
	});
}

async function getDefaultAuthByType(
	kind: SshCredentialKind,
): Promise<string | null> {
	if (kind === "password") {
		const credId = await getSetting("default-ssh-password");
		if (!credId) return null;
		const id = Number(credId.split(":")[1] || "-1");
		if (!id || id === -1) return null;

		const res = await db.query.sshCredential.findFirst({
			where: (cred, { eq }) => eq(cred.id, id),
		});
		if (!res) return null;

		return decryptSecret(res, "setting:default-ssh-password").toString(
			"utf8",
		);
	}

	// SSH Key
	// ---

	const credId = await getSetting("default-ssh-key");
	if (!credId) return null;
	const id = Number(credId.split(":")[1] || "-1");
	if (!id || id === -1) return null;

	const res = await db.query.sshCredential.findFirst({
		where: (cred, { eq }) => eq(cred.id, id),
	});
	if (!res) return null;

	return decryptSecret(res, "setting:default-ssh-key").toString("utf8");
}

async function getDefaultAuth() {
	return {
		password: await getDefaultAuthByType("password"),
		private_key: await getDefaultAuthByType("private_key"),
	};
}
