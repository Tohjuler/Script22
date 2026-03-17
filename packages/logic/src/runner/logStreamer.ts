import { MemoryPublisher } from "@orpc/experimental-publisher/memory";

export type LogType = {
	commandIndex: number;
	type: "stdout" | "stderr" | "end" | "close";
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
