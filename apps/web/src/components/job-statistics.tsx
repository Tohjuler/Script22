import { useQuery } from "@tanstack/react-query";
import { formatDate, formatTime } from "@/lib/utils";
import { client } from "@/utils/orpc";

interface JobStatisticsProps {
	jobId: number;
}

export function JobStatistics({ jobId }: JobStatisticsProps) {
	const { data: stats, isPending } = useQuery({
		queryKey: ["jobs", "statistics", jobId],
		queryFn: () =>
			client.jobs.statistics({
				jobId: jobId,
			}),
	});

	if (isPending || !stats) {
		return <div>Loading...</div>;
	}

	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{/* Left section: Main stats */}
			<div className="space-y-4">
				<div>
					<h3 className="mb-3 font-medium text-muted-foreground text-sm">
						Overview
					</h3>
					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Total Runs:</span>
							<span className="font-medium">{stats.totalRuns}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Completed:</span>
							<span className="font-medium">{stats.completedRuns}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Success Rate:</span>
							<span className="font-medium">
								{stats.successRate.toFixed(1)}%
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Last Run:</span>
							<span className="font-medium">
								{formatDate(stats.lastRun)}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Middle section: Time stats */}
			<div className="space-y-4">
				<div>
					<h3 className="mb-3 font-medium text-muted-foreground text-sm">
						Execution Time
					</h3>
					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Total Time:</span>
							<span className="font-medium">
								{formatTime(stats.totalTimeMs)}
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Average Time:</span>
							<span className="font-medium">
								{stats.averageTimeMs > 0
									? formatTime(stats.averageTimeMs)
									: "--"}
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Fastest Run:</span>
							<span className="font-medium">
								{stats.fastestRunMs && stats.fastestRunMs > 0 ? formatTime(stats.fastestRunMs) : "--"}
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Slowest Run:</span>
							<span className="font-medium">
								{stats.slowestRunMs && stats.slowestRunMs > 0 ? formatTime(stats.slowestRunMs) : "--"}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
