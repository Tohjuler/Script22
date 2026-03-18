import { useMutation, useQuery } from "@tanstack/react-query";
import yaml from "js-yaml";
import { AlertTriangleIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { client, queryClient } from "@/utils/orpc";
import { SimpleYamlEditor } from "./simple-yaml-editor";
import { Alert, AlertDescription } from "./ui/alert";

const DEFAULT_CONFIG = `schedule:
  enabled: false
  cron: 0 0 * * *
  # Only run on thise servers when on schedule, if empty run on all
  servers: []
  # Exclude thise servers
  excludeServers: []
continueOnFailure: false
commands: 
  - echo "Hello, World!"`;

const jobConfig = z.object({
	schedule: z
		.object({
			enabled: z.boolean().default(false),
			cron: z.string(),
			servers: z.array(z.string()).optional(),
			excludeServers: z.array(z.string()).optional(),
		})
		.optional(),
	continueOnFailure: z.boolean().default(false),
	commands: z.array(z.string()).min(1),
});

interface JobSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	jobId?: number;
}

export function JobSheet({ open, onOpenChange, jobId }: JobSheetProps) {
	const isEditing = !!jobId;

	const { data: job } = useQuery({
		queryKey: ["jobs", "getById", jobId],
		queryFn: () => client.jobs.getById({ id: jobId! }),
		enabled: isEditing,
	});

	const [formData, setFormData] = useState({
		name: "",
		config: DEFAULT_CONFIG,
	});

	// Update form when job data loads
	useEffect(() => {
		if (job) {
			setFormData({
				name: job.name,
				config: job.config,
			});
		}
	}, [job]);

	const createMutation = useMutation({
		mutationFn: (input: { name: string; config: string }) =>
			client.jobs.create(input),
		onSuccess: () => {
			toast.success("Job created successfully");
			queryClient.invalidateQueries({ queryKey: ["jobs"] });
			onOpenChange(false);
			resetForm();
		},
		onError: (error: Error) => {
			toast.error(`Failed to create job: ${error.message}`);
		},
	});

	const updateMutation = useMutation({
		mutationFn: (input: { id: number; name?: string; config?: string }) =>
			client.jobs.update(input),
		onSuccess: () => {
			toast.success("Job updated successfully");
			queryClient.invalidateQueries({ queryKey: ["jobs"] });
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(`Failed to update job: ${error.message}`);
		},
	});

	const resetForm = () => {
		setFormData({
			name: "",
			config: DEFAULT_CONFIG,
		});
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (isEditing) {
			updateMutation.mutate({
				id: jobId!,
				name: formData.name,
				config: formData.config,
			});
		} else {
			createMutation.mutate({
				name: formData.name,
				config: formData.config,
			});
		}
	};

	const usesSudo = useMemo(() => {
		try {
			const parsedConfig = jobConfig.parse(
				jobConfig.safeParse(yaml.load(formData.config)).data,
			);
			return parsedConfig.commands.some(
				(cmd) => cmd.trim().startsWith("sudo") || cmd.includes(" sudo"),
			);
		} catch {
			return false;
		}
	}, [formData.config]);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="max-w-[90vw] overflow-y-auto data-[side=right]:md:max-w-[40vw]">
				<SheetHeader>
					<SheetTitle>{isEditing ? "Edit Job" : "Create Job"}</SheetTitle>
					<SheetDescription>
						{isEditing
							? "Update the job configuration"
							: "Create a new job to run on your servers"}
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit} className="mt-3 space-y-4 px-3">
					<Field>
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							placeholder="Update packages"
							autoComplete="off"
							required
						/>
					</Field>

					<Field>
						<Label htmlFor="config">Config</Label>
						<SimpleYamlEditor
							id="config"
							value={formData.config}
							onValueChange={(value) =>
								setFormData({ ...formData, config: value })
							}
							placeholder={DEFAULT_CONFIG}
							className="font-mono"
							zodType={jobConfig}
						/>
					</Field>

					{usesSudo && (
						<Alert variant="warning">
							<AlertTriangleIcon />
							<AlertDescription className="text-xs">
								When using <code>sudo</code> in commands, you will need to have
								passwordless sudo configured for the user running the job,
								otherwise the job will fail when it tries to execute those
								commands.
							</AlertDescription>
						</Alert>
					)}

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
							disabled={createMutation.isPending || updateMutation.isPending}
						>
							{isEditing ? "Update" : "Create"}
						</Button>
					</div>
				</form>
			</SheetContent>
		</Sheet>
	);
}
