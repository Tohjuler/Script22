import { env } from "@script22/env/server";
import pino from "pino";

export const logger =
	env.NODE_ENV === "production" || env.NODE_ENV === "test"
		? // JSON in production and test
			pino({
				level: env.LOG_LEVEL || "info",
			})
		: // Pretty print in development
			pino({
				transport: {
					target: "pino-pretty",
					options: {
						colorize: true,
					},
				},
				level: "debug",
			});
