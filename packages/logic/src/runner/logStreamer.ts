import { MemoryPublisher } from "@orpc/experimental-publisher/memory";
import type { ExecResult } from "./job";

export type LogType = {
	commandIndex: number;
	type: "stdout" | "stderr" | "start" | "end" | "close";
	data: string;
};

const logs: Record<string, LogType[]> = {};

export const logStreamer = new MemoryPublisher<{
	[runId: string]: LogType;
}>();

export function streamLog(runId: string, log: LogType) {
	if (!logs[runId]) logs[runId] = [];

	logs[runId].push(log);
	logStreamer.publish(runId, log);
}

export function getLogs(runId: string) {
	return logs[runId] || [];
}

export function clearLogs(runId: string) {
	logStreamer.publish(runId, { type: "close", commandIndex: -1, data: "" });
	delete logs[runId];
}

export function rebuildExecResult(runId: string): ExecResult[] {
	const logEntries = getLogs(runId);

	const result: ExecResult[] = [];

	let current: ExecResult | null = null;
	const end = (status: string) => {
		if (!current) return;
		current.status = Number.parseInt(status, 10);
		result.push(current);
		current = null;
	};

	for (const log of logEntries) {
		if (log.type === "start") {
			if (current) end("-1");
			current = { command: log.data, status: 0, stdout: "", stderr: "" };
		} else if (log.type === "stdout" && current) {
			current.stdout += log.data;
		} else if (log.type === "stderr" && current) {
			current.stderr += log.data;
		} else if (log.type === "end" && current) end(log.data);
	}
	if (current) end("-1");

	return result;
}
