/** biome-ignore-all lint/suspicious/noArrayIndexKey: Don't have a better way to key these */
import {
	experimental_streamedQuery as streamedQuery,
	useQuery,
} from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { client } from "@/utils/orpc";
import type { ExecResult } from "./run-details-sheet";

type LogLine = {
	commandIndex: number;
	type: "stdout" | "stderr" | "start" | "end" | "close";
	data: string;
};

export default function LogViewer({
	runId,
	logs,
	onFinish,
}: {
	runId?: number;
	logs?: ExecResult[];
	onFinish?: () => void;
}) {
	const containerRef = useRef<HTMLDivElement>(null);

	const { data: streamedLogs } = useQuery({
		queryKey: ["runs", "liveLogs", runId],
		queryFn: streamedQuery({
			streamFn: () => client.runs.getLiveOutputByRunId({ id: runId || 0 }),
		}),
		enabled: !!runId && (!logs || logs.length === 0),
		retry: false,
		refetchOnWindowFocus: false,
	});

	const parsedLogs: LogLine[] = useMemo(() => {
		if (logs && logs.length > 0) {
			return logs.flatMap((log, index) => {
				const stdoutLines = log.stdout
					.split("\n")
					.filter((line) => line.trim() !== "");
				const stderrLines = log.stderr
					.split("\n")
					.filter((line) => line.trim() !== "");
				const logLines: LogLine[] = [];

				logLines.push({
					commandIndex: index,
					type: "start",
					data: "",
				});

				stdoutLines.forEach((line) => {
					logLines.push({
						commandIndex: index,
						type: "stdout",
						data: line,
					});
				});

				stderrLines.forEach((line) => {
					logLines.push({
						commandIndex: index,
						type: "stderr",
						data: line,
					});
				});

				logLines.push({
					commandIndex: index,
					type: "end",
					data: log.status.toString(),
				});

				return logLines;
			});
		}
		if (streamedLogs && streamedLogs.length > 0) {
			let lastCmdIdx = -1;
			const logLines: LogLine[] = [];
			for (const line of streamedLogs) {
				if (line.type === "close") {
					if (onFinish) onFinish();
					break;
				}

				if (lastCmdIdx !== line.commandIndex) {
					logLines.push({
						commandIndex: line.commandIndex,
						type: "start",
						data: "",
					});
					lastCmdIdx = line.commandIndex;
				}

				logLines.push(line);
			}
			return logLines;
		}

		return [];
	}, [logs, streamedLogs, onFinish]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: The extra param is used to trigger the useEffect to scroll.
	useEffect(() => {
		if (!containerRef.current) return;
		containerRef.current.scrollTop = containerRef.current.scrollHeight;
	}, [parsedLogs.length]);

	return (
		<div
			ref={containerRef}
			className="max-h-[70vh] overflow-auto rounded-lg border p-4"
		>
			{parsedLogs.map((log, index) => {
				const style = {
					stdout: "border-l-green-500",
					stderr: "border-l-red-500",
					start: "border-l-gray-500 text-muted-foreground text-sm mt-3",
					end: "border-l-gray-500 text-muted-foreground text-sm",
					close: "",
				};

				return (
					<p
						key={`${index}-${log.commandIndex}`}
						className={`wrap-normal w-full text-wrap border-l-2 px-2 hover:bg-card/40 ${style[log.type]}`}
					>
						{log.type === "start" && `Command ${log.commandIndex + 1} started.`}
						{log.type === "end" &&
							`Command ${log.commandIndex + 1} exited with status ${log.data}`}
						{(log.type === "stdout" || log.type === "stderr") && log.data}
					</p>
				);
			})}
		</div>
	);
}
