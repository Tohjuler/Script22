import { db } from "@script22/db";
import { decryptSecret } from "@script22/db/credentialUtils";
import type { SshCredentialKind } from "@script22/db/schema/main";
import { getSetting } from "../settings";

export async function getDefaultAuthByType(
	kind: SshCredentialKind,
): Promise<string | null> {
	if (kind === "password") {
		const credId = await getSetting("default-ssh-password");
		if (!credId) return null;
		const id = Number(credId.split(":")[1] || "-1");
		if (!id || id === -1) return null;

		const res = await db.query.sshCredential.findFirst({
			where: (cred, { eq }) => eq(cred.id, id),
		});
		if (!res) return null;

		return decryptSecret(res, "setting:default-ssh-password").toString("utf8");
	}

	// SSH Key
	// ---

	const credId = await getSetting("default-ssh-key");
	if (!credId) return null;
	const id = Number(credId.split(":")[1] || "-1");
	if (!id || id === -1) return null;

	const res = await db.query.sshCredential.findFirst({
		where: (cred, { eq }) => eq(cred.id, id),
	});
	if (!res) return null;

	return decryptSecret(res, "setting:default-ssh-key").toString("utf8");
}

export async function getDefaultAuth() {
	return {
		password: await getDefaultAuthByType("password"),
		private_key: await getDefaultAuthByType("private_key"),
	};
}
