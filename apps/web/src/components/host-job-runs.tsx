import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { client } from "@/utils/orpc";

interface HostJobRunsProps {
	runs: Array<{
		id: number;
		jobId: number;
		state: string;
		finishedAt?: Date | null;
		createdAt: Date;
	}>;
}

export function HostJobRuns({ runs }: HostJobRunsProps) {
	const { data: jobs } = useQuery({
		queryKey: ["jobs", "getList"],
		queryFn: () => client.jobs.getList({}),
	});

	// Group runs by job and calculate stats
	const jobStats = useMemo(() => {
		const statsMap = new Map<
			number,
			{
				jobId: number;
				jobName: string;
				totalRuns: number;
				totalTimeMs: number;
				states: Record<string, number>;
			}
		>();

		for (const run of runs) {
			const existing = statsMap.get(run.jobId);
			const job = jobs?.find((j) => j.id === run.jobId);
			const jobName = job?.name || `Job ${run.jobId}`;

			if (!existing) {
				statsMap.set(run.jobId, {
					jobId: run.jobId,
					jobName,
					totalRuns: 0,
					totalTimeMs: 0,
					states: {},
				});
			}

			const stats = statsMap.get(run.jobId)!;
			stats.totalRuns++;
			stats.states[run.state] = (stats.states[run.state] || 0) + 1;

			if (run.finishedAt && run.createdAt) {
				const startTime = new Date(run.createdAt).getTime();
				const endTime = new Date(run.finishedAt).getTime();
				stats.totalTimeMs += endTime - startTime;
			}
		}

		return Array.from(statsMap.values());
	}, [runs, jobs]);

	const formatTime = (ms: number) => {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m`;
		}
		if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`;
		}
		return `${seconds}s`;
	};

	const getStateColor = (state: string) => {
		switch (state.toLowerCase()) {
			case "success":
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
		<Card>
			<CardHeader>
				<CardTitle>Jobs</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					{jobStats.length === 0 ? (
						<p className="py-4 text-center text-muted-foreground text-sm">
							No jobs have been run on this host yet
						</p>
					) : (
						jobStats.map((stat) => (
							<div
								key={stat.jobId}
								className="flex items-center justify-between rounded border p-3 hover:bg-accent"
							>
								<div className="flex-1">
									<div className="font-medium">{stat.jobName}</div>
									<div className="text-muted-foreground text-sm">
										{stat.totalRuns} runs • {formatTime(stat.totalTimeMs)} total
									</div>
									<div className="mt-1 flex gap-2">
										{Object.entries(stat.states).map(([state, count]) => (
											<span
												key={state}
												className={cn("text-xs", getStateColor(state))}
											>
												{state}: {count}
											</span>
										))}
									</div>
								</div>
								<Button size="sm" variant="outline">
									Run
								</Button>
							</div>
						))
					)}
				</div>
			</CardContent>
		</Card>
	);
}
