import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { capitalizeFirstLetter, cn, formatTime } from "@/lib/utils";
import { client, queryClient } from "@/utils/orpc";
import LogViewer from "./log-viewer";

interface RunDetailsSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	runId: number | null;
}

export interface ExecResult {
	status: number;
	stdout: string;
	stderr: string;
}

export function RunDetailsSheet({
	open,
	onOpenChange,
	runId,
}: RunDetailsSheetProps) {
	const { data: run } = useQuery({
		queryKey: ["runs", "getById", runId],
		queryFn: () => client.runs.getById({ id: runId! }),
		enabled: !!runId,
	});

	const { data: output } = useQuery({
		queryKey: ["runs", "getOutputByRunId", runId],
		queryFn: () => client.runs.getOutputByRunId({ id: runId! }),
		enabled: !!runId,
	});

	const { data: job } = useQuery({
		queryKey: ["jobs", "getById", run?.jobId],
		queryFn: () => client.jobs.getById({ id: run!.jobId }),
		enabled: !!run?.jobId,
	});

	const { data: server } = useQuery({
		queryKey: ["servers", "getById", run?.serverId],
		queryFn: () => client.servers.getById({ id: run!.serverId }),
		enabled: !!run?.serverId,
	});

	const parsedOutput = useMemo(() => {
		if (!output) return [];
		return JSON.parse(output as string) as ExecResult[];
	}, [output]);

	const getDuration = () => {
		if (!run?.createdAt) return "N/A";
		const start = new Date(run.createdAt).getTime();
		const end = run.finishedAt
			? new Date(run.finishedAt).getTime()
			: Date.now();
		return formatTime(end - start);
	};

	const getStateColor = (state: string) => {
		switch (state.toLowerCase()) {
			case "success":
			case "succeeded":
				return "text-green-600";
			case "failed":
				return "text-red-600";
			case "running":
				return "text-yellow-600";
			default:
				return "text-muted-foreground";
		}
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full max-w-[90vw] p-0 data-[side=right]:md:max-w-[40vw]">
				<SheetHeader className="p-6 pb-4">
					<SheetTitle>Run Details</SheetTitle>
					<SheetDescription>
						{job?.name || "Job"} on {server?.name || "Server"}
					</SheetDescription>
				</SheetHeader>

				<div className="space-y-4 px-6 pb-6">
					{/* Run Info */}
					<div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
						<div>
							<p className="text-muted-foreground text-sm">Status</p>
							<p className={cn("font-medium", getStateColor(run?.state || ""))}>
								{capitalizeFirstLetter(run?.state || "Unknown")}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground text-sm">Duration</p>
							<p className="font-medium">{getDuration()}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-sm">Started</p>
							<p className="font-medium">
								{run?.createdAt
									? new Date(run.createdAt).toLocaleString()
									: "N/A"}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground text-sm">Finished</p>
							<p className="font-medium">
								{run?.finishedAt
									? new Date(run.finishedAt).toLocaleString()
									: "N/A"}
							</p>
						</div>
					</div>

					{/* Command Outputs */}
					<div>
						<h3 className="mb-2 font-semibold text-sm">Command Logs</h3>
						<LogViewer
							logs={parsedOutput}
							runId={runId ?? undefined}
							onFinish={() => {
								queryClient.invalidateQueries({
									queryKey: ["runs", "getById", runId],
								});
								queryClient.invalidateQueries({
									queryKey: ["runs", "getOutputByRunId", runId],
								});
							}}
						/>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
