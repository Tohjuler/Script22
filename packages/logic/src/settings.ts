import { db } from "@script22/db";
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
	logger.debug("Fetched setting %s: %s", key, setting ? setting.value : "not found");
	return setting ? setting.value : defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
	const setting = await db.query.setting.findFirst({
		where: (setting, { eq }) => eq(setting.key, key),
	});

	if (key === "default-ssh-key" || key === "default-ssh-password") throw new Error("This is not implemented. Use the UI.")

	if (!setting) {
		const newSetting = await db
			.insert(Tables.setting)
			.values({ key: key, value: value })
			.returning()
			.then((res) => res[0]);
		if (!newSetting) throw new Error("Failed to insert new setting");
		return;
	}

	const updatedSetting = await db
		.update(Tables.setting)
		.set({ value: value })
		.where(eq(Tables.setting.key, key))
		.returning()
		.then((res) => res[0]);
	if (!updatedSetting) throw new Error("Failed to update setting");
}
