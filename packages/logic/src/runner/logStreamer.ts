import { MemoryPublisher } from "@orpc/experimental-publisher/memory";

export type LogType = {
	commandIndex: number;
	type: "stdout" | "stderr" | "end";
	data: string;
};

export const logStreamer = new MemoryPublisher<{
	[runId: string]: LogType;
}>();
