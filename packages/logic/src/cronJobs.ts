import { db } from "@script22/db";
import { YAML } from "bun";
import { CronJob } from "cron";
import { queueJob } from "./jobRunner";
import { logger } from "./logger";
import { type JobConfig, jobConfig } from "./types";

const cronJobs: {
	[key: string]: CronJob;
} = {};

export async function handleCronJobs() {
	const jobs = await db.query.job.findMany();

	for (const job of jobs) {
		try {
			const config = jobConfig.parse(YAML.parse(job.config));
			if (!config.commands || config.commands.length === 0)
				throw new Error("No commands to run");

			await handleConfigUpdate(job.id, config);
		} catch (err) {
			logger.error(err, "Error parsing job config for job ID %d:", job.id);
		}
	}
	logger.info(
		"Cron jobs have been set up, total: %d",
		Object.keys(cronJobs).length,
	);
}

export async function handleConfigUpdate(jobId: number, config: JobConfig) {
	if (cronJobs[jobId]) {
		// Job already exists, remove it
		cronJobs[jobId]?.stop();
		delete cronJobs[jobId];
		logger.info("Existing cron job for job ID %d stopped and removed", jobId);
	}

	if (!config.schedule?.enabled) {
		logger.info("Cron job for job ID %d is disabled, skipping setup", jobId);
		return;
	}

	const cronJob = new CronJob(
		config.schedule.cron,
		async () => {
			await handleRun(jobId, config);
		},
		null,
		true,
		process.env.TZ || undefined,
	);
	cronJobs[jobId] = cronJob;
	logger.info(
		"Cron job for job ID %d has been set up with schedule: %s",
		jobId,
		config.schedule.cron,
	);
}

export function removeCronJob(jobId: number) {
	if (cronJobs[jobId]) {
		cronJobs[jobId]?.stop();
		delete cronJobs[jobId];
	}
}

export function getNextRunTime(jobId: number): Date | null {
	const cronJob = cronJobs[jobId];
	if (!cronJob) return null;
	return cronJob.nextDate().toJSDate() || null;
}

export async function handleRun(jobId: number, config: JobConfig) {
	logger.debug("Handling scheduled run for job ID %d", jobId);
	if (!config.schedule) return;
	let servers: { id: number; name: string }[] = [];
	if (config.schedule.servers && config.schedule.servers.length > 0) {
		for (const serverName of config.schedule.servers) {
			const server = await db.query.server.findFirst({
				where: (table, { eq, or }) =>
					or(eq(table.name, serverName), eq(table.id, Number(serverName) || 0)),
			});
			if (server) servers.push(server);
		}
	} else
		servers = await db.query.server.findMany({
			columns: { id: true, name: true },
		});

	servers = servers.filter((server) => {
		if (!config.schedule?.excludeServers) return true;
		return (
			!config.schedule.excludeServers.includes(String(server.id)) &&
			!config.schedule.excludeServers.includes(server.name)
		);
	});

	logger.debug(
		{
			servers: servers.map((s) => ({ id: s.id, name: s.name })),
		},
		"Queuing job ID %d on servers:",
		jobId,
	);

	for (const server of servers) {
		logger.info("Queuing job ID %d on server ID %d", jobId, server.id);
		queueJob(server.id, jobId).catch((err) => {
			logger.error(
				err,
				"Error queuing job ID %d on server ID %d:",
				jobId,
				server.id,
			);
		});
	}
}
