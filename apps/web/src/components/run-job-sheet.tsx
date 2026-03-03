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

interface RunJobSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	serverId: number;
}

export function RunJobSheet({
	open,
	onOpenChange,
	serverId,
}: RunJobSheetProps) {
	const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

	const { data: jobs } = useQuery({
		queryKey: ["jobs", "getList"],
		queryFn: () => client.jobs.getList({}),
	});

	const runJobMutation = useMutation({
		mutationFn: (input: { jobId: number; serverId: number }) =>
			client.jobs.runOnServer(input),
		onSuccess: (data) => {
			toast.success(`Job started with run ID: ${data.runId}`);
			queryClient.invalidateQueries({ queryKey: ["runs"] });
			onOpenChange(false);
			setSelectedJobId(null);
		},
		onError: (error: Error) => {
			toast.error(`Failed to run job: ${error.message}`);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedJobId) return;

		runJobMutation.mutate({
			jobId: selectedJobId,
			serverId,
		});
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="p-2">
				<SheetHeader>
					<SheetTitle>Run Job</SheetTitle>
					<SheetDescription>
						Select a job to run on this server
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit} className="mt-3 space-y-4 px-3">
					<Field>
						<Label htmlFor="job">Job</Label>
						<Select
							value={String(selectedJobId || "")}
							onValueChange={(value) =>
								setSelectedJobId(value ? Number(value) : null)
							}
						>
							<SelectTrigger id="job">
								<SelectValue placeholder="Select job" />
							</SelectTrigger>
							<SelectContent>
								{jobs?.map((job) => (
									<SelectItem key={job.id} value={job.id.toString()}>
										{job.name}
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
						<Button
							type="submit"
							className="flex-1"
							disabled={!selectedJobId || runJobMutation.isPending}
						>
							Run
						</Button>
					</div>
				</form>
			</SheetContent>
		</Sheet>
	);
}
