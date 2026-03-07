import { db } from "@script22/db";
import * as schema from "@script22/db/schema/auth";
import { AuthTables } from "@script22/db/schema/auth";
import { env } from "@script22/env/server";
import { logger } from "@script22/logic/logger";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "sqlite",

		schema: schema,
	}),
	trustedOrigins: [env.CORS_ORIGIN],
	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
		requireEmailVerification: false,
	},
	advanced: {
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			httpOnly: true,
		},
	},
	plugins: [],
	databaseHooks: {
		user: {
			create: {
				before: async (user, ctx) => {
					if (ctx?.path === "/sign-up/email") {
						// Temporary fix for better-auth issue #424
						if (user.name === user.email) {
							return {
								data: {
									...user,
									name: undefined,
								},
							};
						}
					}
				},
			},
		},
	},
	hooks: {
		before: createAuthMiddleware(async (ctx) => {
			if (ctx.path.startsWith("/sign-up")) {
				const hasUser = (await db.$count(AuthTables.user)) !== 0;

				if (hasUser) {
					throw new APIError("BAD_REQUEST", {
						message: "Endpoint not allowed",
					});
				}
			}
		}),
	},
	logger: {
		log: (level, message, ...args) => {
			logger[level]({ ...args }, message);
		},
	},
});
