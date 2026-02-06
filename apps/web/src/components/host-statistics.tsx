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

		for (const run of runs) {
			// Count states
			stateCounts[run.state] = (stateCounts[run.state] || 0) + 1;

			// Calculate time for completed runs
			if (run.finishedAt && run.createdAt) {
				const startTime = new Date(run.createdAt).getTime();
				const endTime = new Date(run.finishedAt).getTime();
				totalTimeMs += endTime - startTime;
				completedRuns++;
			}
		}

		return {
			stateCounts,
			totalRuns: runs.length,
			averageTimeMs: completedRuns > 0 ? totalTimeMs / completedRuns : 0,
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

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Statistics</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Runs:</span>
							<span className="font-medium">{stats.totalRuns}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Time Used:</span>
							<span className="font-medium">
								{formatTime(stats.averageTimeMs * stats.totalRuns)}
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Most used job:</span>
							<span className="font-medium">-</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Added on:</span>
							<span className="font-medium">-</span>
						</div>
					</div>

					{chartData.length > 0 && (
						<div className="mt-4">
							<ChartContainer config={chartConfig} className="h-50">
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
				</CardContent>
			</Card>
		</div>
	);
}
