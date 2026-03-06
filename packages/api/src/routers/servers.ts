import { createZodSchema, db } from "@script22/db";
import {
	createEncryptedCredential,
	updateEncryptedCredential,
} from "@script22/db/credentialUtils";
import { Tables } from "@script22/db/schema/index";
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
	getById: pp.input(z.object({ id: z.number() })).handler(async ({ input }) => {
		const server = await db.query.server.findFirst({
			columns: {
				credentialId: false, // NEVER return auth details
			},
			where: (server, { eq }) => eq(server.id, input.id),
			with: {
				folder: true,
				credential: {
					columns: {
						kind: true,
					},
				},
			},
		});
		return server;
	}),
	create: pp
		.input(
			createZodSchema(Tables.server)
				.insert.omit({
					id: true,
					createdAt: true,
					updatedAt: true,
				})
				.extend({
					authKind: z.enum(["password", "private_key"]),
					authSecret: z.string().optional(),
				}),
		)
		.handler(async ({ input }) => {
			const { authKind, authSecret, ...serverData } = input;

			let credentialId: number | null = null;
			if (authKind && authSecret) {
				const credential = await createEncryptedCredential(
					authKind,
					authSecret,
				);
				if (!credential) throw new Error("Failed to create credential");
				credentialId = credential.id;
			}

			const newServer = await db
				.insert(Tables.server)
				.values({ ...serverData, credentialId: credentialId })
				.returning();

			if (!newServer[0]) throw new Error("Failed to create server");

			return newServer[0];
		}),
	update: pp
		.input(
			createZodSchema(Tables.server)
				.insert.omit({
					createdAt: true,
					updatedAt: true,
				})
				.partial()
				.extend({
					id: z.number(),
					authKind: z.enum(["password", "private_key"]).optional(),
					authSecret: z.string().optional(),
				}),
		)
		.handler(async ({ input }) => {
			const { id, authKind, authSecret, ...data } = input;

			if (authKind && authSecret) {
				const credentialId = await db.query.server
					.findFirst({
						where: (server, { eq }) => eq(server.id, id),
						columns: {
							credentialId: true,
						},
					})
					.then((res) => res?.credentialId);
				if (credentialId) {
					await updateEncryptedCredential(
						credentialId,
						authKind,
						authSecret,
					).catch((err) => {
						console.error("Failed to update credential:", err);
						throw new Error("Failed to update credential");
					});
				} else {
					const newCredential = await createEncryptedCredential(
						authKind,
						authSecret,
					);
					if (!newCredential) throw new Error("Failed to create credential");
					data.credentialId = newCredential.id;
				}
			}

			const updatedServer = await db
				.update(Tables.server)
				.set(data)
				.where(eq(Tables.server.id, id))
				.returning();

			if (!updatedServer[0]) throw new Error("Failed to update server");

			return updatedServer[0];
		}),
	delete: pp.input(z.object({ id: z.number() })).handler(async ({ input }) => {
		const deletedServer = await db
			.delete(Tables.server)
			.where(eq(Tables.server.id, input.id))
			.returning();
		if (!deletedServer[0]) throw new Error("Failed to delete server");

		if (deletedServer[0].credentialId)
			await db
				.delete(Tables.sshCredential)
				.where(eq(Tables.sshCredential.id, deletedServer[0].credentialId));

		return deletedServer;
	}),
};
