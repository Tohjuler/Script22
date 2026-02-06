import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { JobSheet } from "@/components/job-sheet";
import { Button } from "@/components/ui/button";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/_pathlessLayout/")({
	component: DashboardPage,
});

function DashboardPage() {
	const [isJobSheetOpen, setIsJobSheetOpen] = useState(false);
	const [selectedJobId, setSelectedJobId] = useState<number | undefined>();

	const { data: jobs } = useQuery({
		queryKey: ["jobs", "getList"],
		queryFn: () => client.jobs.getList({}),
	});

	return (
		<div className="space-y-8 p-4">
			<div className="flex items-center gap-2">
				<Button variant="outline" size="sm">
					✕ Hosts
				</Button>
				<Button variant="outline" size="sm">
					✕ Hosts online
				</Button>
				<Button variant="outline" size="sm">
					✕ Jobs
				</Button>
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
					<div className="space-y-2 rounded-lg border p-4">
						{jobs && jobs.length > 0 ? (
							jobs.map((job) => (
								<div
									key={job.id}
									className="flex cursor-pointer items-center justify-between rounded border p-3 hover:bg-accent"
								>
									<span>{job.name}</span>
									<div className="flex gap-2">
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
										<Button size="sm" variant="outline">
											Run
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
		</div>
	);
}
