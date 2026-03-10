import type { Client } from "ssh2";
import { logger } from "../logger";
import type { ExecResult } from "./job";

export function execCommand(
	conn: Client,
	command: string | undefined,
	next: (res: ExecResult) => void,
) {
	if (!command) throw new Error("No command provided");

	logger.debug("Executing command: %s", command);
	conn.exec(command, (err, stream) => {
		if (err) throw err;
		let stdout = "";
		let stderr = "";
		stream
			.on("close", (code: number, signal: string) => {
				logger.debug(
					'Command "%s" finished with code %d, signal %s',
					command,
					code,
					signal,
				);
				next({ status: code, stdout, stderr });
			})
			.on("data", (data: Buffer) => {
				logger.debug("STDOUT: %s", data.toString());
				stdout += data.toString();
			})
			.stderr.on("data", (data: Buffer) => {
				logger.debug("STDERR: %s", data.toString());
				stderr += data.toString();
			});
	});
}
