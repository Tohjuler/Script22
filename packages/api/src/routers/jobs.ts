import { createZodSchema, db } from "@script22/db";
import { Tables } from "@script22/db/schema/main";
import {
	getNextRunTime,
	handleConfigUpdate,
	handleRun,
	removeCronJob,
} from "@script22/logic/cronJobs";
import { queueJob } from "@script22/logic/jobRunner";
import { logger } from "@script22/logic/logger";
import { jobConfig } from "@script22/logic/types";
import { YAML } from "bun";
import { eq } from "drizzle-orm";
import z from "zod/v4";
import { protectedProcedure as pp } from "../index";

export const jobsRouter = {
	getList: pp.handler(async () => {
		const jobs = await db.query.job
			.findMany({
				columns: {
					id: true,
					name: true,
					config: true,
				},
			})
			.then((rows) =>
				rows.map((job) => ({
					...job,
					nextRunTime: getNextRunTime(job.id),
				})),
			);
		return jobs;
	}),
	getById: pp.input(z.object({ id: z.number() })).handler(async ({ input }) => {
		const job = await db.query.job.findFirst({
			where: (job, { eq }) => eq(job.id, input.id),
		});
		if (!job) throw new Error(`Job with id ${input.id} not found`);
		return { ...job, nextRunTime: getNextRunTime(job.id) };
	}),
	create: pp
		.input(
			createZodSchema(Tables.job).insert.omit({
				id: true,
				createdAt: true,
				updatedAt: true,
			}),
		)
		.handler(async ({ input }) => {
			// Validate config
			let config: unknown;
			try {
				config = YAML.parse(input.config);
			} catch (err) {
				throw new Error(
					`Invalid YAML config: ${err instanceof Error ? err.message : `${err}`}`,
				);
			}

			const parsed = jobConfig.safeParse(config);
			if (!parsed.success) {
				throw new Error(`Invalid job config: ${z.prettifyError(parsed.error)}`);
			}

			const newJob = await db
				.insert(Tables.job)
				.values(input)
				.returning()
				.then((rows) => rows?.[0]);

			if (!newJob) throw new Error("Failed to create new job");

			handleConfigUpdate(newJob.id, parsed.data).catch((err) => {
				logger.error(err, "Error updating cron job for job ID %d:", newJob.id);
			});

			return newJob;
		}),
	update: pp
		.input(
			createZodSchema(Tables.job)
				.insert.omit({
					createdAt: true,
					updatedAt: true,
				})
				.partial()
				.extend({
					id: z.number(),
				}),
		)
		.handler(async ({ input }) => {
			const job = await db.query.job.findFirst({
				where: (job, { eq }) => eq(job.id, input.id),
			});
			if (!job) throw new Error(`Job with id ${input.id} not found`);

			let updatedConfig: z.infer<typeof jobConfig> | undefined;
			if (input.config && input.config !== job.config) {
				// Validate config
				const parsed = jobConfig.safeParse(YAML.parse(input.config));
				if (!parsed.success) {
					throw new Error(
						`Invalid job config: ${z.prettifyError(parsed.error)}`,
					);
				}
				updatedConfig = parsed.data;
			}

			const versionNumber =
				(await db.$count(
					Tables.jobVersion,
					eq(Tables.jobVersion.jobId, input.id),
				)) + 1;

			await db.insert(Tables.jobVersion).values({
				jobId: input.id,
				name: job.name,
				config: job.config,
				version: versionNumber,
			});

			const updatedJob = await db
				.update(Tables.job)
				.set(input)
				.where(eq(Tables.job.id, input.id))
				.returning()
				.then((rows) => rows?.[0]);
			if (!updatedJob)
				throw new Error(`Failed to update job with id ${input.id}`);

			if (updatedConfig) {
				handleConfigUpdate(input.id, updatedConfig).catch((err) => {
					logger.error(err, "Error updating cron job for job ID %d:", input.id);
				});
			}

			return updatedJob;
		}),
	delete: pp.input(z.object({ id: z.number() })).handler(async ({ input }) => {
		const deletedJob = await db
			.delete(Tables.job)
			.where(eq(Tables.job.id, input.id))
			.returning();
		removeCronJob(input.id);
		return deletedJob;
	}),

	run: pp.input(z.object({ jobId: z.number() })).handler(async ({ input }) => {
		const job = await db.query.job.findFirst({
			where: (job, { eq }) => eq(job.id, input.jobId),
		});
		if (!job) throw new Error(`Job with id ${input.jobId} not found`);

		const config = jobConfig.parse(YAML.parse(job.config));
		if (!config.commands || config.commands.length === 0)
			throw new Error("No commands to run");

		await handleRun(job.id, config);

		return { message: "Job run started" };
	}),

	runOnServer: pp
		.input(z.object({ jobId: z.number(), serverId: z.number() }))
		.handler(async ({ input }) => {
			const job = await db.query.job.findFirst({
				where: (job, { eq }) => eq(job.id, input.jobId),
			});
			if (!job) throw new Error(`Job with id ${input.jobId} not found`);

			const server = await db.query.server.findFirst({
				where: (server, { eq }) => eq(server.id, input.serverId),
			});
			if (!server)
				throw new Error(`Server with id ${input.serverId} not found`);

			const runId = await queueJob(input.serverId, input.jobId, true).catch((err) => {
				logger.error(
					err,
					"Error running job ID %d on server ID %d:",
					input.jobId,
					input.serverId,
				);
				return undefined;
			});
			if (!runId) throw new Error("Failed to start job run");

			return { message: "Job run started", runId };
		}),

	versions: {
		getAll: pp
			.input(z.object({ jobId: z.number() }))
			.handler(async ({ input }) => {
				const versions = await db.query.jobVersion.findMany({
					where: (jobVersion, { eq }) => eq(jobVersion.jobId, input.jobId),
				});
				return versions;
			}),
		getById: pp
			.input(z.object({ id: z.number() }))
			.handler(async ({ input }) => {
				const version = await db.query.jobVersion.findFirst({
					where: (jobVersion, { eq }) => eq(jobVersion.id, input.id),
				});
				return version;
			}),
	},
};
