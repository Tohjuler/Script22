import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const folder = sqliteTable("folder", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	parentId: integer("parent_id"),
	name: text("name").notNull(),
	color: text("color"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const folderRelations = relations(folder, ({ many }) => ({
	servers: many(server),
}));

export const server = sqliteTable("server", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	host: text("host").notNull().unique(),
	authType: text("auth_type").notNull(),
	auth: text("auth"),
	folderId: integer("folder_id").references(() => folder.id),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const serverRelations = relations(server, ({ one }) => ({
	folder: one(folder, {
		fields: [server.folderId],
		references: [folder.id],
	}),
}));

export const job = sqliteTable("job", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	config: text("config").notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const jobRelations = relations(job, ({ many }) => ({
	versions: many(jobVersion),
}));

export const jobVersion = sqliteTable(
	"job_version",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		jobId: integer("job_id")
			.notNull()
			.references(() => job.id, { onDelete: "cascade" }),
		version: integer("version").notNull(),
		name: text("name").notNull(),
		config: text("config").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("jobVersion_jobId_version_idx").on(table.jobId, table.version),
	],
);

export const jobVersionRelations = relations(jobVersion, ({ one }) => ({
	job: one(job, {
		fields: [jobVersion.jobId],
		references: [job.id],
	}),
}));

export const jobRun = sqliteTable(
	"job_run",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		jobId: integer("job_id")
			.notNull()
			.references(() => job.id, { onDelete: "cascade" }),
		serverId: integer("server_id")
			.notNull()
			.references(() => server.id, { onDelete: "cascade" }),
		state: text("state").notNull(),
		output: text("output"),
		finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("jobRun_jobId_serverId_idx").on(table.jobId, table.serverId),
	],
);

export const jobRunRelations = relations(jobRun, ({ one }) => ({
	job: one(job, {
		fields: [jobRun.jobId],
		references: [job.id],
	}),
	server: one(server, {
		fields: [jobRun.serverId],
		references: [server.id],
	}),
}));

export const setting = sqliteTable("setting", {
	key: text("key").primaryKey(),
	value: text("value").notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const Tables = {
	folder,
	server,
	job,
	jobVersion,
	jobRun,
	setting,
} as const;
export type Tables = typeof Tables;
