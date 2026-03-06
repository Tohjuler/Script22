import { env } from "@script22/env/server";
import type { Table } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import * as schema from "./schema";

export const db = drizzle({
	connection: {
		source: env.DB_FILE_NAME || "",
		create: true,
	},
	schema,
});

export async function migrateDb(path: string) {
	migrate(db, {
		migrationsFolder: path,
	});
}

export function createZodSchema<T extends Table>(table: T) {
	return {
		insert: createInsertSchema<T>(table),
		select: createSelectSchema<T>(table),
	};
}
