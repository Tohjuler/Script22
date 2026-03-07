import { createZodSchema, db } from "@script22/db";
import { AuthTables, Tables } from "@script22/db/schema/index";
import { setSetting } from "@script22/logic/settings";
import { z } from "zod/v4";
import { protectedProcedure as pp, publicProcedure } from "../index";

const PROTECTED_SETTINGS = ["default-ssh-key", "default-ssh-password"];

export const settingsRouter = {
	getAll: pp.handler(async () => {
		const settings = await db.query.setting.findMany();
		return settings.map((setting) => ({
			key: setting.key,
			value: PROTECTED_SETTINGS.includes(setting.key)
				? "HIDDEN"
				: setting.value,
		}));
	}),
	get: pp.input(z.object({ key: z.string() })).handler(async ({ input }) => {
		const setting = await db.query.setting.findFirst({
			where: (setting, { eq }) => eq(setting.key, input.key),
		});
		if (!setting) return null;

		if (PROTECTED_SETTINGS.includes(setting.key))
			return { key: setting.key, value: "HIDDEN" };
		return setting;
	}),
	set: pp
		.input(
			z.object({
				key: z.string(),
				value: z.string(),
			}),
		)
		.output(createZodSchema(Tables.setting).select)
		.handler(async ({ input }) => {
			return await setSetting(input.key, input.value);
		}),

	needSetup: publicProcedure.handler(async () => {
		return (await db.$count(AuthTables.user)) === 0;
	}),
};
