import { db } from "@server-updator/db";
import { YAML } from "bun";
import { CronJob } from "cron";
import runJob from "./jobRunner";
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
			console.error(`Error parsing job config for job ID ${job.id}:`, err);
		}
	}
	console.log(
		"Cron jobs have been set up, total:",
		Object.keys(cronJobs).length,
	);
}

export async function handleConfigUpdate(jobId: number, config: JobConfig) {
	if (cronJobs[jobId]) {
		// Job already exists, remove it
		cronJobs[jobId]?.stop();
		delete cronJobs[jobId];
	}

	if (!config.schedule?.enabled) return;

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
}

export function removeCronJob(jobId: number) {
	if (cronJobs[jobId]) {
		cronJobs[jobId]?.stop();
		delete cronJobs[jobId];
	}
}

async function handleRun(jobId: number, config: JobConfig) {
	console.debug(`Handling scheduled run for job ID ${jobId}`);
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

	console.debug(
		`Running job ID ${jobId} on servers:`,
		servers.map((s) => s.id),
	);

	for (const server of servers) {
		console.log(`Running job ID ${jobId} on server ID ${server.id}`);
		runJob(server.id, jobId).catch((err) => {
			console.error(
				`Error running job ID ${jobId} on server ID ${server.id}:`,
				err,
			);
		});
	}
}
