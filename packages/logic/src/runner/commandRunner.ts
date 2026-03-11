import type { Client } from "ssh2";
import { logger } from "../logger";
import type { ExecResult } from "./job";
import type { LogType } from "./logStreamer";

export function execCommand(
	conn: Client,
	command: string | undefined,
	log: (data: { type: LogType["type"]; data: string }) => void,
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
				log({ type: "end", data: code.toString() });
				next({ status: code, stdout, stderr });
			})
			.on("data", (data: Buffer) => {
				logger.debug("STDOUT: %s", data.toString());
				stdout += data.toString();
				log({ type: "stdout", data: data.toString() });
			})
			.stderr.on("data", (data: Buffer) => {
				logger.debug("STDERR: %s", data.toString());
				stderr += data.toString();
				log({ type: "stderr", data: data.toString() });
			});
	});
}
