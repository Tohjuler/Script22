/** biome-ignore-all lint/correctness/noUnusedVariables: It's fine */
import { cors } from "@elysiajs/cors";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext } from "@script22/api/context";
import { appRouter } from "@script22/api/routers/index";
import { auth } from "@script22/auth";
import { migrateDb } from "@script22/db";
import { env } from "@script22/env/server";
import { handleCronJobs, startCleanupCronJob } from "@script22/logic/cronJobs";
import { logger } from "@script22/logic/logger";
import { getSetting, setSetting } from "@script22/logic/settings";
import { Elysia } from "elysia";

const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			logger.error(error);
		}),
	],
});
const apiHandler = new OpenAPIHandler(appRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
	interceptors: [
		onError((error) => {
			logger.error(error);
		}),
	],
});

// biome-ignore lint/suspicious/noTsIgnore: This is needed
// @ts-ignore
const app = new Elysia()
	.onError(({ error }) => {
		logger.error(
			error,
			"A error occurred: %s",
			"message" in error ? error.message : "Unknown error",
		);
	})
	.use(
		cors({
			origin: env.CORS_ORIGIN,
			methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
			credentials: true,
		}),
	)
	.all("/api/auth/*", async (context) => {
		const { request, status } = context;
		if (["POST", "GET"].includes(request.method)) {
			return auth.handler(request);
		}
		return status(405);
	})
	.all("/rpc*", async (context) => {
		const { response } = await rpcHandler.handle(context.request, {
			prefix: "/rpc",
			context: await createContext({ context }),
		});
		return response ?? new Response("Not Found", { status: 404 });
	})
	.all("/api*", async (context) => {
		const { response } = await apiHandler.handle(context.request, {
			prefix: "/api-reference",
			context: await createContext({ context }),
		});
		return response ?? new Response("Not Found", { status: 404 });
	})
	.get("/", () => "OK")
	.get("/test-error", () => {
		throw new Error("Test error for logging");
	})
	.listen(3000, async () => {
		logger.info("Server is running on http://localhost:3000");

		logger.info("Migrating database...");
		await migrateDb(
			env.NODE_ENV === "production"
				? "./drizzle"
				: "./node_modules/@script22/db/src/migrations",
		)
			.then(() => {
				logger.info("Database migrated successfully");
			})
			.catch((err) => {
				logger.error(err, "Error migrating database:");
			});

		if (!(await getSetting("apprise-url")) && env.APPRISE_URL) {
			await setSetting("apprise-url", env.APPRISE_URL);
			logger.info("Set Apprise URL from environment variable");
		}

		logger.info("Starting cron jobs...");
		await handleCronJobs().catch((err) => {
			logger.error(err, "Error starting cron jobs:");
		});

		startCleanupCronJob().catch((err) => {
			logger.error(err, "Error starting cleanup cron job:");
		});
	});
