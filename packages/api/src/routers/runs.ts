import { db } from "@server-updator/db";
import z from "zod/v4";
import { protectedProcedure as pp } from "../index";

export const runsRouter = {
	getList: pp
		.input(
			z.object({
				limit: z.number().optional().default(50),
				offset: z.number().optional().default(0),
			}),
		)
		.handler(async ({ input }) => {
			const runs = await db.query.jobRun.findMany({
				columns: {
					id: true,
					jobId: true,
					serverId: true,
					state: true,
					finishedAt: true,
					createdAt: true,
					updatedAt: true,
				},
				limit: input.limit,
				offset: input.offset,
				orderBy: (run, { desc }) => [desc(run.createdAt)],
			});
			return runs;
		}),
	getByJobId: pp
		.input(z.object({ jobId: z.number() }))
		.handler(async ({ input }) => {
			const runs = await db.query.jobRun.findMany({
				columns: {
					id: true,
					serverId: true,
					state: true,
					finishedAt: true,
					createdAt: true,
					updatedAt: true,
				},
				where: (run, { eq }) => eq(run.jobId, input.jobId),
				orderBy: (run, { desc }) => [desc(run.createdAt)],
			});
			return runs;
		}),
	getByServerId: pp
		.input(z.object({ serverId: z.number() }))
		.handler(async ({ input }) => {
			const runs = await db.query.jobRun.findMany({
				columns: {
					id: true,
					jobId: true,
					state: true,
					finishedAt: true,
					createdAt: true,
					updatedAt: true,
				},
				where: (run, { eq }) => eq(run.serverId, input.serverId),
				orderBy: (run, { desc }) => [desc(run.createdAt)],
			});
			return runs;
		}),
	getById: pp
		.input(z.object({ id: z.number() }))
		.handler(async ({ input }) => {
			const run = await db.query.jobRun.findFirst({
				where: (run, { eq }) => eq(run.id, input.id),
			});
			return run;
		}),
	getOutputByRunId: pp
		.input(z.object({ id: z.number() }))
		.handler(async ({ input }) => {
			const run = await db.query.jobRun.findFirst({
				columns: {
					output: true,
				},
				where: (run, { eq }) => eq(run.id, input.id),
			});
			return run?.output;
		}),
};
