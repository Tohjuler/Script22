import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HostJobRuns } from "@/components/host-job-runs";
import { HostSheet } from "@/components/host-sheet";
import { HostStatistics } from "@/components/host-statistics";
import { RunJobOnServerSheet } from "@/components/run-job-server-sheet";
import { Button } from "@/components/ui/button";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/_pathlessLayout/hosts/$hostId")({
	component: HostDetailPage,
});

function HostDetailPage() {
	const { hostId } = Route.useParams();
	const navigate = useNavigate();
	const [isRunJobSheetOpen, setIsRunJobSheetOpen] = useState(false);
	const [isEditHostSheetOpen, setIsEditHostSheetOpen] = useState(false);
	const [isThereRunningJob, setIsThereRunningJob] = useState(false);

	const { data: host } = useQuery({
		queryKey: ["servers", "getById", Number(hostId)],
		queryFn: () => client.servers.getById({ id: Number(hostId) }),
	});

	const { data: runs } = useQuery({
		queryKey: ["runs", "getByServerId", Number(hostId)],
		queryFn: () => client.runs.getByServerId({ serverId: Number(hostId) }),
		refetchInterval: () => {
			return isThereRunningJob ? 2000 : false;
		}, // Poll every 3 seconds if there's a running job
	});

	useEffect(() => {
		setIsThereRunningJob(runs?.some((run) => run.state === "running") || false);
	}, [runs]);

	if (!host) {
		return <div className="flex-1 p-6">Loading...</div>;
	}

	return (
		<div className="flex-1 space-y-6 overflow-auto p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl">{host.name}</h1>
					<button
						className="text-muted-foreground text-sm"
						type="button"
						onClick={() => {
							navigator.clipboard.writeText(
								`${host.username}@${host.host}:${host.port}`,
							);
							toast.success("Host details copied to clipboard");
						}}
					>
						{host.username}@{host.host}:{host.port}
					</button>
				</div>
				<div className="flex items-center space-x-2">
					<Button onClick={() => setIsRunJobSheetOpen(true)}>Run Job</Button>
					<Button onClick={() => setIsEditHostSheetOpen(true)}>Edit</Button>
				</div>
			</div>

			<HostStatistics runs={runs || []} />

			{/* Jobs Section */}
			<HostJobRuns
				runs={runs || []}
				serverId={Number(hostId)}
				isThereRunningJob={isThereRunningJob}
			/>

			{/* Sheets */}
			<RunJobOnServerSheet
				open={isRunJobSheetOpen}
				onOpenChange={setIsRunJobSheetOpen}
				serverId={Number(hostId)}
			/>
			<HostSheet
				open={isEditHostSheetOpen}
				onOpenChange={setIsEditHostSheetOpen}
				hostId={Number(hostId)}
				onDeleted={() => navigate({ to: "/" })}
			/>
		</div>
	);
}
