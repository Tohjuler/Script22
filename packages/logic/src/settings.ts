import { db } from "@script22/db";

export async function getSetting(key: string, defaultValue: string | null = null): Promise<string | null> {
	const setting = await db.query.setting.findFirst({
		where: (table, { eq }) => eq(table.key, key),
	});
	return setting ? setting.value : defaultValue;
}
