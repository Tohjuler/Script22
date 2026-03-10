import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DB_FILE_NAME: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		CORS_ORIGIN: z.url(),
		CREDENTIALS_MASTER_KEY_B64: z.string().min(44).max(44), // base64 of 32 bytes is always 44 chars
		LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
		APPRISE_URL: z.url().optional(),
		JOB_RUNNER_CONCURRENCY: z.number().int().positive().default(3),
		JOB_RUNNER_JOB_TIMEOUT: z.number().int().positive().default(15), // In minutes
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
