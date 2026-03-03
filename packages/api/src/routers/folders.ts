import { createZodSchema, db } from "@script22/db";
import { Tables } from "@script22/db/schema/main";
import { eq } from "drizzle-orm";
import z from "zod/v4";
import { protectedProcedure as pp } from "../index";

export const foldersRouter = {
	getList: pp.handler(async () => {
		const folders = await db.query.folder.findMany({
			columns: {
				id: true,
				name: true,
				color: true,
			},
		});
		return folders;
	}),
	getServersIn: pp
		.input(z.object({ folderId: z.number() }))
		.handler(async ({ input }) => {
			const servers = await db.query.server.findMany({
				where: (server, { eq }) => eq(server.folderId, input.folderId),
			});
			return servers;
		}),
	create: pp
		.input(
			createZodSchema(Tables.folder).insert.omit({
				id: true,
				createdAt: true,
				updatedAt: true,
			}),
		)
		.handler(async ({ input }) => {
			const newFolder = await db
				.insert(Tables.folder)
				.values(input)
				.returning();
			return newFolder[0]
		}),
	update: pp
		.input(
			createZodSchema(Tables.folder)
				.insert.omit({
					createdAt: true,
					updatedAt: true,
				})
				.partial()
				.extend({
					id: z.number(),
				}),
		)
		.handler(async ({ input }) => {
			const updatedFolder = await db
				.update(Tables.folder)
				.set(input)
				.where(eq(Tables.folder.id, input.id))
				.returning();
			return updatedFolder;
		}),
	delete: pp.input(z.object({ id: z.number() })).handler(async ({ input }) => {
		const deletedFolder = await db
			.delete(Tables.folder)
			.where(eq(Tables.folder.id, input.id))
			.returning();
		return deletedFolder;
	}),
};
