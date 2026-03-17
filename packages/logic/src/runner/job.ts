import { db } from "@script22/db";
import { getDecryptedCredential } from "@script22/db/credentialUtils";
import { Tables } from "@script22/db/schema/main";
import { YAML } from "bun";
import { eq } from "drizzle-orm";
import { Client } from "ssh2";
import type z from "zod";
import { onJobEnd } from "../jobRunner";
import { logger } from "../logger";
import { sendJobNotification } from "../notificationsUtils";
import { jobConfig } from "../types";
import { execCommand } from "./commandRunner";
import { clearLogs, type LogType, streamLog } from "./logStreamer";
import { getDefaultAuth } from "./sshAuth";

export type Job = {
	id: number;
	jobId: number;
	serverId: number;
	startedAt: Date;
	client: Client;

	// ---
	cancel: (message?: string) => Promise<void>;
};

export type QueuedJob = {
	id: number;
	jobId: number;
	serverId: number;

	// ---
	start: () => Promise<Job>;
};

export type ExecResult = {
	status: number;
	stdout: string;
	stderr: string;
};

export async function createJob(
	serverId: number,
	jobId: number,
): Promise<QueuedJob> {
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

	const run = await db
		.insert(Tables.jobRun)
		.values({
			jobId: jobId,
			serverId: serverId,
			state: "pending",
		})
		.returning({ id: Tables.jobRun.id, createdAt: Tables.jobRun.createdAt })
		.then((rows) => rows[0]);
	if (!run) throw new Error("Failed to create job run record");
	const runId = run.id;

	return {
		id: runId,
		jobId,
		serverId: server.id,

		start: async () => {
			const res = await startJob(runId, jobId, { ...server, config }).catch(
				async (err) => {
					logger.error(err, "Unexpected error during job execution");
					await finishJob(runId, "failed", [
						{
							status: -1,
							stdout: "",
							stderr: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
						},
					]);

					return null;
				},
			);
			if (!res) throw new Error("Failed to start job");

			return res;
		},
	};
}

export async function requeueJob(runId: number): Promise<QueuedJob> {
	const jobRun = await db.query.jobRun.findFirst({
		columns: { jobId: true, serverId: true },
		with: {
			job: {
				columns: {
					config: true,
				},
			},
			server: true,
		},
		where: (table, { eq, and }) =>
			and(eq(table.id, runId), eq(table.state, "pending")),
	});
	if (!jobRun) throw new Error("Job run record not found");

	const config = jobConfig.parse(YAML.parse(jobRun.job.config));
	if (!config.commands || config.commands.length === 0)
		throw new Error("No commands to run");

	return {
		id: runId,
		jobId: jobRun.jobId,
		serverId: jobRun.serverId,

		start: async () => {
			const res = await startJob(runId, jobRun.jobId, {
				...jobRun.server,
				config,
			}).catch(async (err) => {
				logger.error(err, "Unexpected error during job execution");
				await finishJob(runId, "failed", [
					{
						status: -1,
						stdout: "",
						stderr: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
					},
				]);

				return null;
			});
			if (!res) throw new Error("Failed to start job");

			return res;
		},
	};
}

async function startJob(
	runId: number,
	jobId: number,
	server: typeof Tables.server.$inferSelect & {
		config: z.infer<typeof jobConfig>;
	},
): Promise<Job | null> {
	const auth = server.credentialId
		? await getDecryptedCredential(server.credentialId)
		: null;

	const defaultAuth = !auth ? await getDefaultAuth() : null;

	const finish = (state: "failed" | "succeeded", output: ExecResult[]) =>
		finishJob(runId, state, output);

	if (!auth && !defaultAuth?.password && !defaultAuth?.private_key) {
		finish("failed", [
			{
				status: -1,
				stdout: "",
				stderr: "No authentication method available for this server",
			},
		]);
		return null;
	}

	// Mark job as running
	const startedAt = await db
		.update(Tables.jobRun)
		.set({ state: "running", startedAt: new Date() })
		.where(eq(Tables.jobRun.id, runId))
		.returning({ startedAt: Tables.jobRun.startedAt })
		.then((res) => res[0]?.startedAt)
		.catch((err) => {
			logger.error(err, "Error updating job run record to running state:");
			return null;
		});
	if (!startedAt) {
		finish("failed", [
			{
				status: -1,
				stdout: "",
				stderr: "Failed to update job run state to running",
			},
		]);
		return null;
	}

	const sshKey =
		auth?.kind === "private_key"
			? auth.secret
			: defaultAuth?.private_key || undefined;
	const sshPassword =
		auth?.kind === "password"
			? auth.secret
			: defaultAuth?.password || undefined;

	const client = new Client();
	client
		.on("ready", () => {
			logger.debug(
				{
					serverId: server.id,
					jobId: jobId,
				},
				"SSH Connection ready",
			);

			const log = (data: Omit<LogType, "commandIndex">) =>
				streamLog(runId.toString(), {
					commandIndex: currentCommandIndex,
					type: data.type,
					data: data.data,
				});

			let currentCommandIndex = 0;
			const commandOutputs: ExecResult[] = [];
			const callback = (result: ExecResult) => {
				if (result.status !== 0 && !server.config.continueOnFailure) {
					logger.error(result, "Command failed, aborting further execution");
					finish("failed", commandOutputs.concat(result));
					client.end();
					return;
				}
				logger.debug(result, "Command execution result");

				if (currentCommandIndex + 1 < server.config.commands.length) {
					currentCommandIndex++;
					commandOutputs.push(result);
					execCommand(
						client,
						server.config.commands[currentCommandIndex],
						log,
						callback,
					);
				} else {
					logger.debug("All commands executed");
					finish("succeeded", commandOutputs.concat(result));
					client.end();
				}
			};
			execCommand(client, server.config.commands[0] || "", log, callback);
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
			client.end();
		})
		.connect({
			host: server.host,
			port: server.port,
			username: server.username,

			privateKey: sshKey,
			password: sshPassword,
		});

	return {
		id: runId,
		jobId,
		serverId: server.id,
		startedAt,
		client: client,

		cancel: async (message?: string) => {
			finish("failed", [
				{
					status: -1,
					stdout: "",
					stderr: `Job cancelled${message ? `: ${message}` : ""}`,
				},
			]);
			client.end();
		},
	};
}

async function finishJob(
	runId: number,
	state: "failed" | "succeeded",
	output: ExecResult[],
) {
	const res = await db.query.jobRun.findFirst({
		columns: {
			startedAt: true,
			createdAt: true,
		},
		with: {
			server: {
				columns: {
					name: true,
				},
			},
			job: {
				columns: {
					name: true,
				},
			},
		},
		where: (table, { eq }) => eq(table.id, runId),
	});
	if (!res) {
		logger.error("Job run record not found for runId %d", runId);
		return;
	}

	clearLogs(runId.toString()); // Remove logs from memory

	const finishedAt = new Date();
	const startedAt = res.startedAt || res.createdAt || new Date();
	const timeTaken = finishedAt.getTime() - startedAt.getTime();

	const statusCode = output[output.length - 1]?.status ?? -1;

	sendJobNotification(state, {
		serverName: res.server.name,
		jobName: res.job.name,
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

	onJobEnd(runId).catch((err) =>
		logger.error(err, "Error occurred while ending job:"),
	); // Call end, so the job can be removed from the runningJobs list and next queued job can start
}
