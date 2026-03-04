import { db } from "@script22/db";
import { encryptSecret } from "@script22/db/credentialUtils";
import { AuthTables, Tables } from "@script22/db/schema/index";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { protectedProcedure as pp, publicProcedure } from "../index";

const PROTECTED_SETTINGS = ["default-ssh-key", "default-ssh-password"];

async function handleCredientialSetting(
	key: string,
	value: string,
	setting: typeof Tables.setting.$inferSelect | undefined, // Value format: "credential:<id>"
	kind: (typeof Tables.sshCredential.$inferInsert)["kind"],
): Promise<typeof Tables.setting.$inferSelect> {
	// Return format: "credential:<id>"
	const { iv, ciphertext, authTag } = encryptSecret(value, `setting:${key}`);

	if (setting?.value) {
		// Update existing credential
		await db
			.update(Tables.sshCredential)
			.set({ iv, ciphertext, authTag })
			.where(
				eq(
					Tables.sshCredential.id,
					Number.parseInt(setting.value.split(":")[1] ?? "-1", 10),
				),
			);
		return setting;
	}

	const id = await db
		.insert(Tables.sshCredential)
		.values({
			kind: kind,
			iv,
			ciphertext,
			authTag,
		})
		.returning({ id: Tables.sshCredential.id })
		.then((res) => res[0]?.id);
	if (id === undefined) throw new Error("Failed to insert SSH key credential");

	const newSetting = await db
		.insert(Tables.setting)
		.values({ key: key, value: `credential:${id.toString()}` })
		.returning()
		.then((res) => res[0]);
	if (!newSetting)
		throw new Error("Failed to insert setting for SSH key credential");
	return newSetting;
}

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
		.handler(async ({ input }) => {
			const setting = await db.query.setting.findFirst({
				where: (setting, { eq }) => eq(setting.key, input.key),
			});

			if (
				input.key === "default-ssh-key" ||
				input.key === "default-ssh-password"
			) {
				console.log("Handling credential setting update for key:", input.key);
				return await handleCredientialSetting(
					input.key,
					input.value,
					setting,
					input.key === "default-ssh-key" ? "private_key" : "password",
				);
			}

			if (!setting) {
				const newSetting = await db
					.insert(Tables.setting)
					.values({ key: input.key, value: input.value })
					.returning();
				return newSetting[0];
			}

			const updatedSetting = await db
				.update(Tables.setting)
				.set({ value: input.value })
				.where(eq(Tables.setting.key, input.key))
				.returning();
			return updatedSetting[0];
		}),

	needSetup: publicProcedure.handler(async () => {
		return (await db.$count(AuthTables.user)) === 0;
	}),
};
