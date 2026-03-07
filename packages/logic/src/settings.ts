import { db } from "@script22/db";
import { encryptSecret } from "@script22/db/credentialUtils";
import { Tables } from "@script22/db/schema/main";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export async function getSetting(
	key: string,
	defaultValue: string | null = null,
): Promise<string | null> {
	const setting = await db.query.setting.findFirst({
		where: (table, { eq }) => eq(table.key, key),
	});
	logger.debug(
		"Fetched setting %s: %s",
		key,
		setting ? setting.value : "not found",
	);
	return setting ? setting.value : defaultValue;
}

export async function setSetting(
	key: string,
	value: string,
): Promise<typeof Tables.setting.$inferSelect> {
	const setting = await db.query.setting.findFirst({
		where: (setting, { eq }) => eq(setting.key, key),
	});

	if (key === "default-ssh-key" || key === "default-ssh-password") {
		if (value === "") {
			// Ignore the set call, this is to allow for preserving the existing credential.
			if (!setting)
				throw new Error("Cannot preserve credential for non-existing setting");
			return setting;
		}
		logger.debug(
			{
				key: key,
			},
			"Handling credential setting update for key:",
		);
		return await handleCredentialSetting(
			key,
			value,
			setting,
			key === "default-ssh-key" ? "private_key" : "password",
		);
	}

	if (!setting) {
		const newSetting = await db
			.insert(Tables.setting)
			.values({ key: key, value: value })
			.returning()
			.then((res) => res[0]);
		if (!newSetting) throw new Error("Failed to insert new setting");
		return newSetting;
	}

	const updatedSetting = await db
		.update(Tables.setting)
		.set({ value: value })
		.where(eq(Tables.setting.key, key))
		.returning()
		.then((res) => res[0]);
	if (!updatedSetting) throw new Error("Failed to update setting");
	return updatedSetting;
}

async function handleCredentialSetting(
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
