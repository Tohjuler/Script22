import type { RouterClient } from "@orpc/server";
import { db } from "@server-updator/db";
import { Tables } from "@server-updator/db/schema/main";
import { protectedProcedure as pp } from "../index";
import { foldersRouter } from "./folders";
import { jobsRouter } from "./jobs";
import { runsRouter } from "./runs";
import { serversRouter } from "./servers";
import { settingsRouter } from "./settings";

export const appRouter = {
	servers: serversRouter,
	folders: foldersRouter,
	jobs: jobsRouter,
	runs: runsRouter,
	settings: settingsRouter,

	getMainStats: pp.handler(async () => {
		const totalHosts = await db.$count(Tables.server);
		const totalRuns = await db.$count(Tables.jobRun);

		return { totalHosts, totalRuns };
	}),
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
