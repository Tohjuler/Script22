import { db } from "@script22/db";
import {
	decryptSecret,
	getDecryptedCredential,
} from "@script22/db/credentialUtils";
import { type SshCredentialKind, Tables } from "@script22/db/schema/main";
import { YAML } from "bun";
import { eq } from "drizzle-orm";
import { Client } from "ssh2";
import { logger } from "./logger";
import { sendJobNotification } from "./notificationsUtils";
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

	const run = await db
		.insert(Tables.jobRun)
		.values({
			jobId: jobId,
			serverId: serverId,
			state: "running",
		})
		.returning({ id: Tables.jobRun.id, createdAt: Tables.jobRun.createdAt })
		.then((rows) => rows[0]);
	if (!run) throw new Error("Failed to create job run record");
	const runId = run.id;

	const finish = async (
		state: "failed" | "succeeded",
		output: ExecResult[],
	) => {
		const finishedAt = new Date();
		const timeTaken = finishedAt.getTime() - run.createdAt.getTime();

		const statusCode = output[output.length - 1]?.status ?? -1;

		sendJobNotification(state, {
			serverName: server.name,
			jobName: job.name,
			exitCode: statusCode,
			time: timeTaken,
		}).catch((err) => {
			logger.error(
				err,
				"Failed to send job completion notification for run %d",
				runId,
			);
		});

		await db
			.update(Tables.jobRun)
			.set({
				state: state,
				output: JSON.stringify(output),
				finishedAt: finishedAt,
			})
			.where(eq(Tables.jobRun.id, runId))
			.catch((err) => {
				logger.error(err, "Error updating job run record:");
			});
	};

	const auth = server.credentialId
		? await getDecryptedCredential(server.credentialId)
		: null;

	const defaultAuth = !auth ? await getDefaultAuth() : null;

	if (!auth && !defaultAuth?.password && !defaultAuth?.private_key) {
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
		auth?.kind === "private_key"
			? auth.secret
			: defaultAuth?.private_key || undefined;
	const sshPassword =
		auth?.kind === "password"
			? auth.secret
			: defaultAuth?.password || undefined;

	try {
		const conn = new Client();
		conn
			.on("ready", () => {
				logger.debug(
					{
						serverId: serverId,
						jobId: jobId,
					},
					"SSH Connection ready",
				);
				let currentCommandIndex = 0;
				const commandOutputs: ExecResult[] = [];
				const callback = (result: ExecResult) => {
					if (result.status !== 0 && !config.continueOnFailure) {
						logger.error(result, "Command failed, aborting further execution");
						finish("failed", commandOutputs.concat(result));
						conn.end();
						return;
					}
					logger.debug(result, "Command execution result");

					if (currentCommandIndex + 1 < config.commands.length) {
						currentCommandIndex++;
						commandOutputs.push(result);
						execCommand(conn, config.commands[currentCommandIndex], callback);
					} else {
						logger.debug("All commands executed");
						finish("succeeded", commandOutputs.concat(result));
						conn.end();
					}
				};
				execCommand(conn, config.commands[0] || "", callback);
			})
			.on("error", (err) => {
				logger.error(err, "SSH Connection error");
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
		logger.error(err, "Unexpected error during job execution");
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

	logger.debug("Executing command: %s", command);
	conn.exec(command, (err, stream) => {
		if (err) throw err;
		let stdout = "";
		let stderr = "";
		stream
			.on("close", (code: number, signal: string) => {
				logger.debug(
					'Command "%s" finished with code %d, signal %s',
					command,
					code,
					signal,
				);
				next({ status: code, stdout, stderr });
			})
			.on("data", (data: Buffer) => {
				logger.debug("STDOUT: %s", data.toString());
				stdout += data.toString();
			})
			.stderr.on("data", (data: Buffer) => {
				logger.debug("STDERR: %s", data.toString());
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

		return decryptSecret(res, "setting:default-ssh-password").toString("utf8");
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
