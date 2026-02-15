import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { JobSheet } from "@/components/job-sheet";
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
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/_pathlessLayout/")({
	component: DashboardPage,
});

function DashboardPage() {
	const [isJobSheetOpen, setIsJobSheetOpen] = useState(false);
	const [selectedJobId, setSelectedJobId] = useState<number | undefined>();
	const [deleteJobId, setDeleteJobId] = useState<number | undefined>();
	const queryClient = useQueryClient();

	const { data: jobs } = useQuery({
		queryKey: ["jobs", "getList"],
		queryFn: () => client.jobs.getList({}),
	});

	const { data: hosts } = useQuery({
		queryKey: ["hosts", "getList"],
		queryFn: () => client.servers.getList({}),
	});

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
						<p className="font-bold text-3xl">{hosts?.length ?? 0}</p>
					</div>
				</Card>
				<Card className="p-6">
					<div className="space-y-2">
						<p className="font-medium text-muted-foreground text-sm">
							Hosts Online
						</p>
						<p className="font-bold text-3xl">0</p>
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
			</div>

			{/* Main Content Grid */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{/* Jobs Section */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="font-semibold text-xl">Jobs</h2>
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
									<span>{job.name}</span>
									<div className="flex gap-2">
										<Button size="sm" variant="outline">
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

				{/* Next Jobs to Run */}
				<div className="space-y-4">
					<h2 className="font-semibold text-xl">Next jobs to run</h2>
					<div className="rounded-lg border p-4">
						<p className="text-muted-foreground text-sm">IN: X:XX</p>
					</div>
				</div>
			</div>

			{/* Sheets */}
			<JobSheet
				open={isJobSheetOpen}
				onOpenChange={setIsJobSheetOpen}
				jobId={selectedJobId}
			/>

			{/* Delete Job Dialog */}
			<AlertDialog
				open={deleteJobId !== undefined}
				onOpenChange={(open: boolean) => {
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
