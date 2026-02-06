import { db } from "@server-updator/db";
import * as schema from "@server-updator/db/schema/auth";
import { AuthTables } from "@server-updator/db/schema/auth";
import { env } from "@server-updator/env/server";
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
});
