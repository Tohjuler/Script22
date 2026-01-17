import { createZodSchema, db } from "@server-updator/db";
import { Tables } from "@server-updator/db/schema/main";
import {
	handleConfigUpdate,
	removeCronJob,
} from "@server-updator/logic/cronJobs";
import runJob from "@server-updator/logic/jobRunner";
import { jobConfig } from "@server-updator/logic/types";
import { eq } from "drizzle-orm";
import z from "zod/v4";
import { protectedProcedure as pp } from "../index";

export const jobsRouter = {
	getList: pp.handler(async () => {
		const jobs = await db.query.job.findMany({
			columns: {
				id: true,
				name: true,
			},
		});
		return jobs;
	}),
	getById: pp.input(z.object({ id: z.number() })).handler(async ({ input }) => {
		const job = await db.query.job.findFirst({
			where: (job, { eq }) => eq(job.id, input.id),
		});
		return job;
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
			const parsed = jobConfig.safeParse(JSON.parse(input.config));
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
				console.error(`Error updating cron job for job ID ${newJob.id}:`, err);
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

			if (input.config) {
				// Validate config
				const parsed = jobConfig.safeParse(JSON.parse(input.config));
				if (!parsed.success) {
					throw new Error(
						`Invalid job config: ${z.prettifyError(parsed.error)}`,
					);
				}
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

			handleConfigUpdate(input.id, JSON.parse(updatedJob.config)).catch(
				(err) => {
					console.error(`Error updating cron job for job ID ${input.id}:`, err);
				},
			);

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

			const runId = await runJob(input.serverId, input.jobId).catch((err) => {
				console.error(
					`Error running job ID ${input.jobId} on server ID ${input.serverId}:`,
					err,
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
