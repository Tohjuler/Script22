import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import JobConfig from "@/components/job-config";
import { JobRunsHistory } from "@/components/job-runs-history";
import { JobStatistics } from "@/components/job-statistics";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { client, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_pathlessLayout/jobs/$jobId")({
	component: JobDetailPage,
});

function JobDetailPage() {
	const { jobId } = Route.useParams();

	const [isRunJobSheetOpen, setIsRunJobSheetOpen] = useState(false);
	const [deleteJobId, setDeleteJobId] = useState<number | undefined>();

	const { data: job, isPending } = useQuery({
		queryKey: ["jobs", "getById", Number(jobId)],
		queryFn: () => client.jobs.getById({ id: Number(jobId) }),
	});

	const deleteJobMutation = useMutation({
		mutationFn: (jobId: number) => client.jobs.delete({ id: jobId }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["jobs", "getList"] });
			setDeleteJobId(undefined);
			redirect({
				to: "/",
			});
			toast.success("Job deleted successfully");
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Failed to delete job",
			);
		},
	});

	if (job === null && !isPending) {
		return (
			<div className="mx-auto flex-1 p-6">
				<h1 className="font-bold text-2xl">Job Not Found</h1>
				<p className="mt-2 text-muted-foreground">
					The job you are looking for does not exist.
				</p>
			</div>
		);
	}
	if (!job) {
		return <div className="flex-1 p-6">Loading...</div>;
	}

	return (
		<div className="flex-1 space-y-6 overflow-auto p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl">{job.name}</h1>
				</div>
				<div className="flex items-center space-x-2">
					<Button onClick={() => setIsRunJobSheetOpen(true)}>Run Job</Button>
					<Button
						variant="destructive"
						onClick={() => setDeleteJobId(job.id)}
						disabled={deleteJobMutation.isPending && deleteJobId === job.id}
					>
						{deleteJobMutation.isPending && deleteJobId === job.id
							? "Deleting..."
							: "Delete"}
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-6">
				<div className="col-span-3 space-y-5">
					{/* Stats */}
					<Card>
						<CardHeader>
							<CardTitle>Statistics</CardTitle>
						</CardHeader>
						<CardContent>
							<JobStatistics jobId={job.id} />
						</CardContent>
					</Card>

					{/* Running Jobs */}
					<JobRunsHistory job={job} />
				</div>

				{/* Configuration */}
				<div className="col-span-3 h-full pl-4">
					<JobConfig job={job} />
				</div>
			</div>

			{/* Sheets */}
			<RunJobSheet
				open={isRunJobSheetOpen}
				onOpenChange={setIsRunJobSheetOpen}
				job={job}
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
