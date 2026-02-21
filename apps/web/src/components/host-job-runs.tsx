import { useMutation, useQuery } from "@tanstack/react-query";
import { capitalizeFirstLetter } from "better-auth";
import { Eye, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RunDetailsSheet } from "@/components/run-details-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { client, queryClient } from "@/utils/orpc";

interface HostJobRunsProps {
	runs: Array<{
		id: number;
		jobId: number;
		state: string;
		finishedAt?: Date | null;
		createdAt: Date;
	}>;
	serverId: number;
}

export function HostJobRuns({ runs, serverId }: HostJobRunsProps) {
	const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
	const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);

	const { data: jobs } = useQuery({
		queryKey: ["jobs", "getList"],
		queryFn: () => client.jobs.getList({}),
	});

	const rerunMutation = useMutation({
		mutationFn: (input: { jobId: number; serverId: number }) =>
			client.jobs.runOnServer(input),
		onSuccess: (data) => {
			toast.success(`Job restarted with run ID: ${data.runId}`);
			queryClient.invalidateQueries({ queryKey: ["runs"] });
		},
		onError: (error: Error) => {
			toast.error(`Failed to rerun job: ${error.message}`);
		},
	});

	const formatTime = (ms: number) => {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
		}
		if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`;
		}
		return `${seconds}s`;
	};

	const getDuration = (run: (typeof runs)[0]) => {
		if (!run.finishedAt) {
			if (run.state === "running") {
				const elapsed = Date.now() - new Date(run.createdAt).getTime();
				return formatTime(elapsed);
			}
			return "N/A";
		}
		const startTime = new Date(run.createdAt).getTime();
		const endTime = new Date(run.finishedAt).getTime();
		return formatTime(endTime - startTime);
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

	const handleViewDetails = (runId: number) => {
		setSelectedRunId(runId);
		setIsDetailsSheetOpen(true);
	};

	const handleRerun = (jobId: number) => {
		rerunMutation.mutate({ jobId, serverId });
	};

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Job Runs</CardTitle>
				</CardHeader>
				<CardContent>
					{runs.length === 0 ? (
						<p className="py-4 text-center text-muted-foreground text-sm">
							No jobs have been run on this host yet
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Job</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Started</TableHead>
									<TableHead>Duration</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{runs.map((run) => {
									const job = jobs?.find((j) => j.id === run.jobId);
									return (
										<TableRow key={run.id}>
											<TableCell className="font-medium">
												{job?.name || `Job ${run.jobId}`}
											</TableCell>
											<TableCell>
												<span
													className={cn(
														"font-medium",
														getStateColor(run.state),
													)}
												>
													{capitalizeFirstLetter(run.state)}
												</span>
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{new Date(run.createdAt).toLocaleString()}
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{run.state === "running" ? "--" : getDuration(run)}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-2">
													<Button
														size="sm"
														variant="outline"
														onClick={() => handleViewDetails(run.id)}
													>
														<Eye className="mr-1 size-3" />
														Details
													</Button>
													<Button
														size="sm"
														variant="outline"
														onClick={() => handleRerun(run.jobId)}
														disabled={rerunMutation.isPending}
													>
														<RotateCcw className="mr-1 size-3" />
														Rerun
													</Button>
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<RunDetailsSheet
				open={isDetailsSheetOpen}
				onOpenChange={setIsDetailsSheetOpen}
				runId={selectedRunId}
			/>
		</>
	);
}
