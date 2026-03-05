import { useQuery } from "@tanstack/react-query";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { cn, formatTime } from "@/lib/utils";
import { client } from "@/utils/orpc";

interface RunDetailsSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	runId: number | null;
}

interface ExecResult {
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

	const parsedOutput: ExecResult[] = output ? JSON.parse(output as string) : [];

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
								{run?.state || "Unknown"}
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
						<div className="max-h-[70vh] space-y-2 overflow-scroll">
							{parsedOutput.length === 0 ? (
								<p className="text-muted-foreground text-sm">
									No output available
								</p>
							) : (
								parsedOutput.map((result, index) => (
									<div
										// biome-ignore lint/suspicious/noArrayIndexKey: Command outputs are ordered and don't have unique IDs
										key={`${runId}-cmd-${index}`}
										className="rounded-lg border p-3"
									>
										<div className="mb-2 flex items-center justify-between">
											<span className="font-medium text-sm">
												Command {index + 1}
											</span>
											<span
												className={cn(
													"text-xs",
													result.status === 0
														? "text-green-600"
														: "text-red-600",
												)}
											>
												Exit code: {result.status}
											</span>
										</div>
										{result.stdout && (
											<div className="mb-2">
												<p className="mb-1 text-muted-foreground text-xs">
													STDOUT:
												</p>
												<pre className="max-h-40 overflow-auto rounded bg-muted p-2 font-mono text-xs">
													{result.stdout}
												</pre>
											</div>
										)}
										{result.stderr && (
											<div>
												<p className="mb-1 text-muted-foreground text-xs">
													STDERR:
												</p>
												<pre className="max-h-40 overflow-auto rounded bg-muted p-2 font-mono text-xs">
													{result.stderr}
												</pre>
											</div>
										)}
									</div>
								))
							)}
						</div>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
