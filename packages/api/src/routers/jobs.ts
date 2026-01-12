import { createZodSchema, db } from "@server-updator/db";
import { Tables } from "@server-updator/db/schema/main";
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
			const newJob = await db.insert(Tables.job).values(input).returning();
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
				.returning();
			return updatedJob;
		}),
	delete: pp.input(z.object({ id: z.number() })).handler(async ({ input }) => {
		const deletedJob = await db
			.delete(Tables.job)
			.where(eq(Tables.job.id, input.id))
			.returning();
		return deletedJob;
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
