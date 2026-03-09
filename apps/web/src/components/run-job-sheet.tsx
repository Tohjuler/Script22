import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { client, queryClient } from "@/utils/orpc";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface RunJobSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	job: {
		id: number;
		name: string;
	};
}

export function RunJobSheet({ open, onOpenChange, job }: RunJobSheetProps) {
	const [selectedServerId, setSelectedServerId] = useState<number | null>(null);

	const { data: servers } = useQuery({
		queryKey: ["servers", "getList"],
		queryFn: () => client.servers.getList({}),
	});

	const runJobOnServerMutation = useMutation({
		mutationFn: (input: { jobId: number; serverId: number }) =>
			client.jobs.runOnServer(input),
		onSuccess: (data) => {
			toast.success(`Job started with run ID: ${data.runId}`);
			queryClient.invalidateQueries({ queryKey: ["runs"] });
			onOpenChange(false);
			setSelectedServerId(null);
		},
		onError: (error: Error) => {
			toast.error(`Failed to run job: ${error.message}`);
		},
	});

	const runJobMutation = useMutation({
		mutationFn: (input: { jobId: number }) =>
			client.jobs.run({ jobId: input.jobId }),
		onSuccess: () => {
			toast.success("Job(s) started.");
			queryClient.invalidateQueries({ queryKey: ["runs"] });
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(`Failed to run job: ${error.message}`);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedServerId) return;

		runJobOnServerMutation.mutate({
			serverId: selectedServerId,
			jobId: job.id,
		});
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				className="p-2"
				onOpenAutoFocus={(event) => event.preventDefault()}
			>
				<SheetHeader>
					<SheetTitle>Run Job</SheetTitle>
					<SheetDescription>
						Select a server to run the job "{job.name}" on.
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit} className="mt-3 space-y-4 px-3">
					<Field>
						<Label htmlFor="server">Server</Label>
						<Select
							value={String(selectedServerId || "")}
							onValueChange={(value) =>
								setSelectedServerId(value ? Number(value) : null)
							}
						>
							<SelectTrigger id="server">
								<SelectValue placeholder="Select server" />
							</SelectTrigger>
							<SelectContent>
								{servers?.map((server) => (
									<SelectItem key={server.id} value={server.id.toString()}>
										{server.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>

					<div className="flex gap-2 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							className="flex-1"
						>
							Cancel
						</Button>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									className="ml-auto"
									onClick={() => runJobMutation.mutate({ jobId: job.id })}
								>
									Run default
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>
									This will run the job as if it was on a schedule, meaning it
									will pick the server(s) based on the job's scheduling config.
								</p>
							</TooltipContent>
						</Tooltip>
						<Button
							type="submit"
							className="flex-1"
							disabled={!selectedServerId || runJobOnServerMutation.isPending}
						>
							Run
						</Button>
					</div>
				</form>
			</SheetContent>
		</Sheet>
	);
}
