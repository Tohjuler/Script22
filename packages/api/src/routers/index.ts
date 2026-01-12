import type { RouterClient } from "@orpc/server";
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
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
