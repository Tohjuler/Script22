import { createZodSchema, db } from "@server-updator/db";
import { Tables } from "@server-updator/db/schema/index";
import { eq } from "drizzle-orm";
import z from "zod/v4";
import { protectedProcedure as pp } from "../index";

export const serversRouter = {
	getList: pp.handler(async () => {
		const servers = await db.query.server.findMany({
			columns: {
				id: true,
				name: true,
			},
			with: {
				folder: {
					columns: {
						id: true,
						name: true,
						color: true,
					},
				},
			},
		});
		return servers;
	}),
	getById: pp
		.input(z.object({ id: z.number() }))
		.handler(async ({ input }) => {
			const server = await db.query.server.findFirst({
				where: (server, { eq }) => eq(server.id, input.id),
				with: {
					folder: true,
				},
			});
			return server;
		}),
	create: pp
		.input(
			createZodSchema(Tables.server).insert.omit({
				id: true,
				createdAt: true,
				updatedAt: true,
			}),
		)
		.handler(async ({ input }) => {
			const newServer = await db
				.insert(Tables.server)
				.values(input)
				.returning();
			return newServer;
		}),
    update: pp
        .input(
            createZodSchema(Tables.server).insert.omit({
                createdAt: true,
                updatedAt: true,
            }).partial().extend({
                id: z.number(),
            }),
        )
        .handler(async ({ input }) => {
            const { id, ...data } = input;
            const updatedServer = await db
                .update(Tables.server)
                .set(data)
                .where(eq(Tables.server.id, id))
                .returning();
            return updatedServer;
        }),
    delete: pp
        .input(z.object({ id: z.number() }))
        .handler(async ({ input }) => {
            const deletedServer = await db
                .delete(Tables.server)
                .where(eq(Tables.server.id, input.id))
                .returning();
            return deletedServer;
        }),
};
