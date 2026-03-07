import pino from "pino";

export const logger =
	process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test"
		? // JSON in production and test
			pino({
				level: process.env.LOG_LEVEL || "info",
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
