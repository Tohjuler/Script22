import { db } from "@script22/db";
import { AuthTables, Tables } from "@script22/db/schema/index";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { protectedProcedure as pp, publicProcedure } from "../index";

export const settingsRouter = {
	getAll: pp.handler(async () => {
		const settings = await db.query.setting.findMany();
		return settings;
	}),
	get: pp.input(z.object({ key: z.string() })).handler(async ({ input }) => {
		const setting = await db.query.setting.findFirst({
			where: (setting, { eq }) => eq(setting.key, input.key),
		});
		return setting;
	}),
	set: pp
		.input(
			z.object({
				key: z.string(),
				value: z.string(),
			}),
		)
		.handler(async ({ input }) => {
			const setting = await db.query.setting.findFirst({
				where: (setting, { eq }) => eq(setting.key, input.key),
			});
			if (!setting) {
				const newSetting = await db
					.insert(Tables.setting)
					.values({ key: input.key, value: input.value })
					.returning();
				return newSetting;
			}

			const updatedSetting = await db
				.update(Tables.setting)
				.set({ value: input.value })
				.where(eq(Tables.setting.key, input.key))
				.returning();
			return updatedSetting;
		}),

	needSetup: publicProcedure.handler(async () => {
		return (await db.$count(AuthTables.user)) === 0;
	}),
};
