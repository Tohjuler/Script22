import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HostJobRuns } from "@/components/host-job-runs";
import { HostStatistics } from "@/components/host-statistics";
import { RunJobSheet } from "@/components/run-job-sheet";
import { Button } from "@/components/ui/button";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/_pathlessLayout/hosts/$hostId")({
	component: HostDetailPage,
});

function HostDetailPage() {
	const { hostId } = Route.useParams();
	const [isRunJobSheetOpen, setIsRunJobSheetOpen] = useState(false);

	const { data: host } = useQuery({
		queryKey: ["servers", "getById", Number(hostId)],
		queryFn: () => client.servers.getById({ id: Number(hostId) }),
	});

	const { data: runs } = useQuery({
		queryKey: ["runs", "getByServerId", Number(hostId)],
		queryFn: () => client.runs.getByServerId({ serverId: Number(hostId) }),
	});

	if (!host) {
		return <div className="flex-1 p-6">Loading...</div>;
	}

	return (
		<div className="flex-1 space-y-6 overflow-auto p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl">{host.name}</h1>
					<p className="text-muted-foreground text-sm">
						{host.username}@{host.host}:{host.port}
					</p>
				</div>
				<Button onClick={() => setIsRunJobSheetOpen(true)}>Run Job</Button>
			</div>

			{/* Grid Layout */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{/* History Section */}
				<div className="space-y-4">
					<h2 className="font-semibold text-xl">History</h2>
					<div className="rounded-lg border p-4">
						<p className="text-muted-foreground text-sm">Time: X:XX</p>
					</div>
				</div>

				{/* Statistics */}
				<HostStatistics runs={runs || []} />
			</div>

			{/* Jobs Section */}
			<HostJobRuns runs={runs || []} />

			{/* Sheets */}
			<RunJobSheet
				open={isRunJobSheetOpen}
				onOpenChange={setIsRunJobSheetOpen}
				serverId={Number(hostId)}
			/>
		</div>
	);
}
