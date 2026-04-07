import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { RunDetailsSheet } from "@/components/run-details-sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatDate, formatTime } from "@/lib/utils";
import { client } from "@/utils/orpc";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip";

interface JobRunsHistoryProps {
	job: {
		id: number;
		name: string;
	};
}

export function JobRunsHistory({ job }: JobRunsHistoryProps) {
	const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
	const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
	const [isThereRunningJob, setIsThereRunningJob] = useState(false);

	const { data: runs } = useQuery({
		queryKey: ["jobs", "runs", job.id],
		queryFn: () =>
			client.runs.getByJobId({
				jobId: job.id,
				limit: 10,
			}),
		refetchInterval: () => {
			return isThereRunningJob ? 2000 : false;
		},
	});

	useEffect(() => {
		setIsThereRunningJob(runs?.some((run) => run.state === "running") || false);
	}, [runs]);

	const getDuration = (run: Exclude<typeof runs, undefined>[0]) => {
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

	const handleViewDetails = (runId: number) => {
		setSelectedRunId(runId);
		setIsDetailsSheetOpen(true);
	};

	return (
		<>
			<Card>
				<CardHeader className="flex items-center justify-between">
					<CardTitle>History</CardTitle>
				</CardHeader>
				<CardContent>
					{!runs || runs.length === 0 ? (
						<p className="py-4 text-center text-muted-foreground text-sm">
							No runs for this job yet
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead />
									<TableHead>Job</TableHead>
									<TableHead>Started</TableHead>
									<TableHead>Duration</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{runs.map((run) => (
									<TableRow
										key={run.id}
										className="hover:cursor-pointer hover:bg-muted"
										onClick={() => handleViewDetails(run.id)}
									>
										<TableCell>{getStatusMarker(run.state)}</TableCell>
										<TableCell className="font-medium">{job.name}</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{formatDate(run.createdAt)}
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{run.state === "running" ? "--" : getDuration(run)}
										</TableCell>
									</TableRow>
								))}
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

function getStatusCss(status: string) {
	switch (status.toLowerCase()) {
		case "succeeded":
			return "bg-green-600";
		case "failed":
			return "bg-red-600";
		case "running":
			return "bg-yellow-600 animate-pulse";
		default:
			return "bg-muted-foreground";
	}
}

function getStatusMarker(status: string) {
	const statusCss = getStatusCss(status);

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger>
					<div className={`h-3 w-3 rounded-full ${statusCss}`} />
				</TooltipTrigger>
				<TooltipContent>
					<p>{status.charAt(0).toUpperCase() + status.slice(1)}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
