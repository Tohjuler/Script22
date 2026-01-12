import { env } from "@server-updator/env/server";
import { drizzle } from "drizzle-orm/bun-sqlite";

import * as schema from "./schema";

export const db = drizzle({
	connection: {
		source: env.DB_FILE_NAME || "",
	},
	schema,
});
