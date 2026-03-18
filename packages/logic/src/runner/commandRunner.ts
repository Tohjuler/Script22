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
	if (!command) {
		log({ type: "stderr", data: "No command provided" });
		next({ status: 1, stdout: "", stderr: "No command provided" });
		return;
	}

	logger.debug("Executing command: %s", command);
	conn.exec(command, (err, stream) => {
		if (err) {
			const message = err instanceof Error ? err.message : String(err);
			logger.error("Failed to execute command '%s': %s", command, message);
			log({ type: "stderr", data: message });
			next({ status: 1, stdout: "", stderr: message });
			return;
		}

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
				if (!code) stderr += signal ? `Process killed with signal ${signal}` : "No exit code, defaulting to 0";
				log({ type: "end", data: (code || 0).toString() });
				next({ status: code || 0, stdout, stderr });
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
