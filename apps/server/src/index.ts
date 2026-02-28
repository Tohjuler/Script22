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
import { handleCronJobs } from "@script22/logic/cronJobs";
import { Elysia } from "elysia";

const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			console.error(error);
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
			console.error(error);
		}),
	],
});

// biome-ignore lint/suspicious/noTsIgnore: This is needed
// @ts-ignore
const app = new Elysia()
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
	.listen(3000, async () => {
		console.log("Server is running on http://localhost:3000");

		console.log("Migrating database...");
		await migrateDb(
			env.NODE_ENV === "production"
				? "./drizzle"
				: "./node_modules/@script22/db/drizzle",
		)
			.then(() => {
				console.log("Database migrated successfully");
			})
			.catch((err) => {
				console.error("Error migrating database:", err);
			});

		console.log("Starting cron jobs...");
		await handleCronJobs().catch((err) => {
			console.error("Error starting cron jobs:", err);
		});
	});
