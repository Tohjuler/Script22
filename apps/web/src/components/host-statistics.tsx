import { useMemo } from "react";
import { Label, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

interface HostStatisticsProps {
	runs: Array<{
		id: number;
		state: string;
		finishedAt?: Date | null;
		createdAt: Date;
	}>;
}

export function HostStatistics({ runs }: HostStatisticsProps) {
	const stats = useMemo(() => {
		const stateCounts: Record<string, number> = {};
		let totalTimeMs = 0;
		let completedRuns = 0;
		let fastestRunMs = Number.POSITIVE_INFINITY;
		let slowestRunMs = 0;
		let lastRunDate: Date | null = null;
		let successfulRuns = 0;
		let failedRuns = 0;
		let runningRuns = 0;
		let pendingRuns = 0;

		for (const run of runs) {
			// Count states
			stateCounts[run.state] = (stateCounts[run.state] || 0) + 1;

			// Track state-specific counts
			if (run.state === "success") successfulRuns++;
			if (run.state === "failed") failedRuns++;
			if (run.state === "running") runningRuns++;
			if (run.state === "pending") pendingRuns++;

			// Track last run
			const runDate = new Date(run.createdAt);
			if (!lastRunDate || runDate > lastRunDate) {
				lastRunDate = runDate;
			}

			// Calculate time for completed runs
			if (run.finishedAt && run.createdAt) {
				const startTime = new Date(run.createdAt).getTime();
				const endTime = new Date(run.finishedAt).getTime();
				const duration = endTime - startTime;

				totalTimeMs += duration;
				completedRuns++;

				if (duration < fastestRunMs) fastestRunMs = duration;
				if (duration > slowestRunMs) slowestRunMs = duration;
			}
		}

		// Calculate success rate
		const finishedRuns = successfulRuns + failedRuns;
		const successRate =
			finishedRuns > 0 ? (successfulRuns / finishedRuns) * 100 : 0;

		return {
			stateCounts,
			totalRuns: runs.length,
			averageTimeMs: completedRuns > 0 ? totalTimeMs / completedRuns : 0,
			totalTimeMs,
			fastestRunMs:
				fastestRunMs === Number.POSITIVE_INFINITY ? 0 : fastestRunMs,
			slowestRunMs,
			lastRunDate,
			successfulRuns,
			failedRuns,
			runningRuns,
			pendingRuns,
			successRate,
			completedRuns,
		};
	}, [runs]);

	const chartData = useMemo(() => {
		const colors = {
			success: "hsl(142, 76%, 36%)",
			failed: "hsl(0, 84%, 60%)",
			running: "hsl(47, 96%, 53%)",
			pending: "hsl(215, 20%, 65%)",
		};

		return Object.entries(stats.stateCounts).map(([state, count]) => ({
			state,
			count,
			fill: colors[state as keyof typeof colors] || "hsl(215, 20%, 65%)",
		}));
	}, [stats]);

	const chartConfig: ChartConfig = {
		count: {
			label: "Runs",
		},
	};

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

	const formatDate = (date: Date | null) => {
		if (!date) return "-";
		return new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}).format(date);
	};

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Statistics</CardTitle>
				</CardHeader>
				<CardContent>
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
											{formatDate(stats.lastRunDate)}
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
												: "-"}
										</span>
									</div>
									<div className="flex justify-between text-sm">
										<span className="text-muted-foreground">Fastest Run:</span>
										<span className="font-medium">
											{stats.fastestRunMs > 0
												? formatTime(stats.fastestRunMs)
												: "-"}
										</span>
									</div>
									<div className="flex justify-between text-sm">
										<span className="text-muted-foreground">Slowest Run:</span>
										<span className="font-medium">
											{stats.slowestRunMs > 0
												? formatTime(stats.slowestRunMs)
												: "-"}
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Right section: Pie chart */}
						{chartData.length > 0 && (
							<div className="flex items-center justify-center">
								<ChartContainer
									config={chartConfig}
									className="h-50 w-full"
								>
									<PieChart>
										<ChartTooltip
											cursor={false}
											content={<ChartTooltipContent hideLabel />}
										/>
										<Pie
											data={chartData}
											dataKey="count"
											nameKey="state"
											innerRadius={60}
											strokeWidth={5}
										>
											<Label
												content={({ viewBox }) => {
													if (viewBox && "cx" in viewBox && "cy" in viewBox) {
														return (
															<text
																x={viewBox.cx}
																y={viewBox.cy}
																textAnchor="middle"
																dominantBaseline="middle"
															>
																<tspan
																	x={viewBox.cx}
																	y={viewBox.cy}
																	className="fill-foreground font-bold text-3xl"
																>
																	{stats.totalRuns}
																</tspan>
																<tspan
																	x={viewBox.cx}
																	y={(viewBox.cy || 0) + 24}
																	className="fill-muted-foreground"
																>
																	Runs
																</tspan>
															</text>
														);
													}
												}}
											/>
										</Pie>
									</PieChart>
								</ChartContainer>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
