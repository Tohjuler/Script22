import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@script22/env/server";
import { eq, sql } from "drizzle-orm";
import { db } from ".";
import { type SshCredentialKind, Tables } from "./schema";

export type EncryptedBlob = {
	iv: Buffer; // 12 bytes for GCM
	ciphertext: Buffer;
	authTag: Buffer; // 16 bytes typical
};

function getMasterKey(): Buffer {
	const key = env.CREDENTIALS_MASTER_KEY_B64;
	if (!key)
		throw new Error(
			"Master key not set in environment variable CREDENTIALS_MASTER_KEY_B64",
		);

	const keyBuffer = Buffer.from(key, "base64");
	if (keyBuffer.length !== 32)
		throw new Error("Master key must be 32 bytes (256 bits)");

	return keyBuffer;
}

/**
 * Encrypts plaintext using AES-256-GCM.
 *
 * @param plaintext String or Buffer secret (password, private key PEM, etc).
 * @param aad Associated authenticated data; must be provided identically on decrypt.
 *            Recommended: `ssh-credential:${credentialId}`
 */
export function encryptSecret(
	plaintext: string | Buffer,
	aad?: string | Buffer,
): EncryptedBlob {
	const key = getMasterKey();

	const iv = randomBytes(12); // recommended size for GCM
	const cipher = createCipheriv("aes-256-gcm", key, iv);

	if (aad)
		cipher.setAAD(typeof aad === "string" ? Buffer.from(aad, "utf8") : aad);

	const input =
		typeof plaintext === "string"
			? Buffer.from(normalizePem(plaintext), "utf8")
			: plaintext;

	const ciphertext = Buffer.concat([cipher.update(input), cipher.final()]);
	const authTag = cipher.getAuthTag();

	return { iv, ciphertext, authTag };
}

/**
 * Decrypts AES-256-GCM encrypted blob.
 *
 * Throws if:
 * - wrong key
 * - wrong aad
 * - corrupted/modified ciphertext/iv/tag
 */
export function decryptSecret(
	encrypted: EncryptedBlob,
	aad?: string | Buffer,
): Buffer {
	const key = getMasterKey();

	const decipher = createDecipheriv("aes-256-gcm", key, encrypted.iv);
	decipher.setAuthTag(encrypted.authTag);

	if (aad)
		decipher.setAAD(typeof aad === "string" ? Buffer.from(aad, "utf8") : aad);

	const plaintext = Buffer.concat([
		decipher.update(encrypted.ciphertext),
		decipher.final(),
	]);

	return plaintext;
}

export function normalizePem(input: string): string {
	let s = input.replace(/\r\n/g, "\n");

	// Safety for keys that arrive with literal \n sequences
	if (s.includes("\\n")) s = s.replace(/\\n/g, "\n");

	return s.trim();
}

// Direct db utils
// ---

export async function createEncryptedCredential(
	kind: SshCredentialKind,
	secret: string | Buffer,
) {
	const nextId = await db
		.select({ maxId: sql<number>`max(${Tables.sshCredential.id})` })
		.from(Tables.sshCredential)
		.then((res) => res[0]?.maxId ?? 0 + 1);

	const { iv, ciphertext, authTag } = encryptSecret(
		secret,
		`ssh-credential:${nextId}`,
	);

	const res = await db
		.insert(Tables.sshCredential)
		.values({
			id: nextId,
			kind,
			iv,
			ciphertext,
			authTag,
		})
		.returning();

	return res[0];
}

export async function updateEncryptedCredential(
	id: number,
	kind: SshCredentialKind,
	secret: string | Buffer,
) {
	const { iv, ciphertext, authTag } = encryptSecret(
		secret,
		`ssh-credential:${id}`,
	);

	const res = await db
		.update(Tables.sshCredential)
		.set({
			kind,
			iv,
			ciphertext,
			authTag,
			updatedAt: new Date(),
		})
		.where(eq(Tables.sshCredential.id, id))
		.returning();

	return res[0];
}

export async function getDecryptedCredential(
	id: number,
): Promise<{ kind: SshCredentialKind; secret: string } | null> {
	const record = await db.query.sshCredential.findFirst({
		where: (cred, { eq }) => eq(cred.id, id),
	});

	if (!record) return null;

	const { kind, iv, ciphertext, authTag } = record;
	const secret = decryptSecret(
		{ iv, ciphertext, authTag },
		`ssh-credential:${id}`,
	);

	return { kind, secret: secret.toString("utf8") };
}
