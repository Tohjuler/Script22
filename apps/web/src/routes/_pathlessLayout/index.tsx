import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	LabelList,
	Pie,
	PieChart,
	XAxis,
} from "recharts";
import { toast } from "sonner";
import { JobSheet } from "@/components/job-sheet";
import { RunJobSheet } from "@/components/run-job-sheet";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { formatDate } from "@/lib/utils";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/_pathlessLayout/")({
	component: DashboardPage,
});

function DashboardPage() {
	const [isJobSheetOpen, setIsJobSheetOpen] = useState(false);
	const [selectedJobId, setSelectedJobId] = useState<number | undefined>();
	const [deleteJobId, setDeleteJobId] = useState<number | undefined>();
	const [runJobId, setRunJobId] = useState<number | undefined>();
	const queryClient = useQueryClient();

	const { data: jobs } = useQuery({
		queryKey: ["jobs", "getList"],
		queryFn: () => client.jobs.getList({}),
	});

	const { data: mainStats } = useQuery({
		queryKey: ["mainStats"],
		queryFn: () => client.getMainStats({}),
	});

	const { data: runs } = useQuery({
		queryKey: ["runs", "getList", 200],
		queryFn: () => client.runs.getList({ limit: 200, offset: 0 }),
	});

	const runStats = useMemo(() => {
		const runsList = runs ?? [];
		const stateCounts = {
			succeeded: 0,
			failed: 0,
			running: 0,
			pending: 0,
			other: 0,
		};

		for (const run of runsList) {
			const state = run.state.toLowerCase();
			if (state in stateCounts) {
				stateCounts[state as keyof typeof stateCounts] += 1;
			} else {
				console.log("Unknown state:", run.state);
				stateCounts.other += 1;
			}
		}

		const finishedRuns = stateCounts.succeeded + stateCounts.failed;
		const successRate =
			finishedRuns > 0 ? (stateCounts.succeeded / finishedRuns) * 100 : 0;

		const now = new Date();
		const dailyMap = new Map<string, { day: string; runs: number }>();
		for (let index = 6; index >= 0; index -= 1) {
			const dayDate = new Date(now);
			dayDate.setDate(now.getDate() - index);
			const key = dayDate.toISOString().slice(0, 10);
			dailyMap.set(key, {
				day: dayDate.toLocaleDateString("en-US", { weekday: "short" }),
				runs: 0,
			});
		}

		for (const run of runsList) {
			const key = new Date(run.createdAt).toISOString().slice(0, 10);
			const existing = dailyMap.get(key);
			if (existing) {
				existing.runs += 1;
			}
		}

		const stateChartData = [
			{
				state: "Succeeded",
				count: stateCounts.succeeded,
				fill: "var(--color-chart-2)",
			},
			{
				state: "Failed",
				count: stateCounts.failed,
				fill: "var(--color-chart-5)",
			},
			{
				state: "Running",
				count: stateCounts.running,
				fill: "var(--color-chart-3)",
			},
			{
				state: "Pending",
				count: stateCounts.pending,
				fill: "var(--color-chart-4)",
			},
			{
				state: "Other",
				count: stateCounts.other,
				fill: "var(--color-chart-1)",
			},
		].filter((item) => item.count > 0);

		const dailyChartData = Array.from(dailyMap.values());

		return {
			total: runsList.length,
			finished: finishedRuns,
			successRate,
			stateChartData,
			dailyChartData,
		};
	}, [runs]);

	const stateChartConfig: ChartConfig = {
		count: {
			label: "Runs",
		},
	};

	const dailyChartConfig: ChartConfig = {
		runs: {
			label: "Runs",
			color: "var(--color-chart-1)",
		},
	};

	const deleteJobMutation = useMutation({
		mutationFn: (jobId: number) => client.jobs.delete({ id: jobId }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["jobs", "getList"] });
			toast.success("Job deleted successfully");
			setDeleteJobId(undefined);
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Failed to delete job",
			);
		},
	});

	return (
		<div className="space-y-8 p-4">
			{/* Stats Cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<Card className="p-6">
					<div className="space-y-2">
						<p className="font-medium text-muted-foreground text-sm">
							Total Hosts
						</p>
						<p className="font-bold text-3xl">{mainStats?.totalHosts ?? 0}</p>
					</div>
				</Card>
				<Card className="p-6">
					<div className="space-y-2">
						<p className="font-medium text-muted-foreground text-sm">
							Total Jobs
						</p>
						<p className="font-bold text-3xl">{jobs?.length ?? 0}</p>
					</div>
				</Card>
				<Card className="p-6">
					<div className="space-y-2">
						<p className="font-medium text-muted-foreground text-sm">
							Total Runs
						</p>
						<p className="font-bold text-3xl">{mainStats?.totalRuns ?? 0}</p>
					</div>
				</Card>
			</div>

			{/* Main Content Grid */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{/* Jobs Section */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="h-8 font-semibold text-xl">Jobs</h2>
						<Button
							size="sm"
							onClick={() => {
								setSelectedJobId(undefined);
								setIsJobSheetOpen(true);
							}}
						>
							<Plus className="mr-1 h-4 w-4" />
							Add
						</Button>
					</div>
					<div className="space-y-2 rounded-lg border p-2">
						{jobs && jobs.length > 0 ? (
							jobs.map((job, i) => (
								<div
									key={job.id}
									className={`flex cursor-pointer items-center justify-between border-t p-2 hover:bg-accent ${i === 0 ? "border-t-0" : ""}`}
								>
									<div className="flex flex-col">
										<span>{job.name}</span>
										<span className="ml-2 text-muted-foreground text-xs">
											Next run: {formatDate(job.nextRunTime)}
										</span>
									</div>
									<div className="flex gap-2">
										<Button size="sm" variant="outline" onClick={() => setRunJobId(job.id)}>
											Run
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={() => {
												setSelectedJobId(job.id);
												setIsJobSheetOpen(true);
											}}
										>
											Edit
										</Button>
										<Button
											size="sm"
											variant="destructive"
											onClick={() => setDeleteJobId(job.id)}
											disabled={
												deleteJobMutation.isPending && deleteJobId === job.id
											}
										>
											{deleteJobMutation.isPending && deleteJobId === job.id
												? "Deleting..."
												: "Delete"}
										</Button>
									</div>
								</div>
							))
						) : (
							<p className="py-4 text-center text-muted-foreground text-sm">
								No jobs created yet
							</p>
						)}
					</div>
				</div>

				{/* Run Insights */}
				<div className="space-y-4">
					<h2 className="h-8 font-semibold text-xl">Run insights</h2>
					<div className="space-y-4 rounded-lg border p-4">
						<div className="grid grid-cols-3 gap-3">
							<div>
								<p className="text-muted-foreground text-xs">Total runs</p>
								<p className="font-semibold text-xl">{runStats.total}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Finished</p>
								<p className="font-semibold text-xl">{runStats.finished}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Success rate</p>
								<p className="font-semibold text-xl">
									{runStats.successRate.toFixed(1)}%
								</p>
							</div>
						</div>

						{runStats.total > 0 ? (
							<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
								<ChartContainer
									className="h-52 w-full"
									config={stateChartConfig}
								>
									<PieChart>
										<ChartTooltip
											cursor={false}
											content={<ChartTooltipContent hideLabel />}
										/>
										<Pie
											data={runStats.stateChartData}
											dataKey="count"
											nameKey="state"
											// innerRadius={55}
											strokeWidth={4}
										>
											<LabelList
												dataKey="state"
												className="fill-background"
												stroke="none"
												fontSize={10}
												// formatter={(value: keyof typeof chartConfig) =>
												// 	chartConfig[value]?.label
												// }
											/>
										</Pie>
									</PieChart>
								</ChartContainer>

								<ChartContainer
									className="h-52 w-full"
									config={dailyChartConfig}
								>
									<BarChart data={runStats.dailyChartData}>
										<CartesianGrid vertical={false} />
										<XAxis dataKey="day" tickLine={false} axisLine={false} />
										<ChartTooltip content={<ChartTooltipContent />} />
										<Bar dataKey="runs" fill="var(--color-runs)" radius={6} />
									</BarChart>
								</ChartContainer>
							</div>
						) : (
							<p className="py-8 text-center text-muted-foreground text-sm">
								No run data yet
							</p>
						)}
					</div>
				</div>
			</div>

			{/* Sheets */}
			<JobSheet
				open={isJobSheetOpen}
				onOpenChange={setIsJobSheetOpen}
				jobId={selectedJobId}
			/>

			<RunJobSheet
				open={runJobId !== undefined}
				onOpenChange={(open) => {
					if (!open) setRunJobId(undefined);
				}}
				job={{
					id: runJobId ?? 0,
					name: jobs?.find((job) => job.id === runJobId)?.name ?? "",
				}}
			/>

			{/* Delete Job Dialog */}
			<AlertDialog
				open={deleteJobId !== undefined}
				onOpenChange={(open) => {
					if (!open) setDeleteJobId(undefined);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Job</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this job? This action cannot be
							undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteJobMutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (deleteJobId !== undefined) {
									deleteJobMutation.mutate(deleteJobId);
								}
							}}
							disabled={deleteJobMutation.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteJobMutation.isPending ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
