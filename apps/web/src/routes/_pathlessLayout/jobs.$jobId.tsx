import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import JobConfig from "@/components/job-config";
import { JobRunsHistory } from "@/components/job-runs-history";
import { JobSheet } from "@/components/job-sheet";
import { JobStatistics } from "@/components/job-statistics";
import { RunJobSheet } from "@/components/run-job-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/_pathlessLayout/jobs/$jobId")({
	component: JobDetailPage,
});

function JobDetailPage() {
	const { jobId } = Route.useParams();

	const [isRunJobSheetOpen, setIsRunJobSheetOpen] = useState(false);
	const [isEditJobSheetOpen, setIsEditJobSheetOpen] = useState(false);

	const { data: job } = useQuery({
		queryKey: ["jobs", "getById", Number(jobId)],
		queryFn: () => client.jobs.getById({ id: Number(jobId) }),
	});

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
					<Button onClick={() => setIsEditJobSheetOpen(true)}>Edit</Button>
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

			{/* <HostStatistics runs={runs || []} /> */}

			{/* Jobs Section */}
			{/* <HostJobRuns
				runs={runs || []}
				serverId={Number(hostId)}
				isThereRunningJob={isThereRunningJob}
			/> */}

			{/* Sheets */}
			<RunJobSheet
				open={isRunJobSheetOpen}
				onOpenChange={setIsRunJobSheetOpen}
				job={job}
			/>

			<JobSheet
				open={isEditJobSheetOpen}
				onOpenChange={setIsEditJobSheetOpen}
				jobId={job.id}
				// TODO: Add delete button to JobSheet
			/>
		</div>
	);
}
