import { env } from "@script22/env/server";
import type { Table } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import * as schema from "./schema";

export const db = drizzle({
	connection: {
		source: env.DB_FILE_NAME || "",
	},
	schema,
});

export function createZodSchema<T extends Table>(table: T) {
	return {
		insert: createInsertSchema<T>(table),
		select: createSelectSchema<T>(table),
	};
}
