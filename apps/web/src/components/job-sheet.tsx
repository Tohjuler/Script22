import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
		scheduleEnabled: false,
		cron: "",
		continueOnFailure: false,
		commands: [""],
	});

	// Update form when job data loads
	useEffect(() => {
		if (job) {
			const config = JSON.parse(job.config);
			setFormData({
				name: config.name || job.name,
				scheduleEnabled: config.schedule?.enabled || false,
				cron: config.schedule?.cron || "",
				continueOnFailure: config.continueOnFailure || false,
				commands: config.commands || [""],
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
			scheduleEnabled: false,
			cron: "",
			continueOnFailure: false,
			commands: [""],
		});
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		const config = {
			name: formData.name,
			schedule: formData.scheduleEnabled
				? {
						enabled: true,
						cron: formData.cron,
					}
				: undefined,
			continueOnFailure: formData.continueOnFailure,
			commands: formData.commands.filter((cmd) => cmd.trim() !== ""),
		};

		if (isEditing) {
			updateMutation.mutate({
				id: jobId!,
				name: formData.name,
				config: JSON.stringify(config),
			});
		} else {
			createMutation.mutate({
				name: formData.name,
				config: JSON.stringify(config),
			});
		}
	};

	const addCommand = () => {
		setFormData({ ...formData, commands: [...formData.commands, ""] });
	};

	const removeCommand = (index: number) => {
		setFormData({
			...formData,
			commands: formData.commands.filter((_, i) => i !== index),
		});
	};

	const updateCommand = (index: number, value: string) => {
		const newCommands = [...formData.commands];
		newCommands[index] = value;
		setFormData({ ...formData, commands: newCommands });
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle>{isEditing ? "Edit Job" : "Create Job"}</SheetTitle>
					<SheetDescription>
						{isEditing
							? "Update the job configuration"
							: "Create a new job to run on your servers"}
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit} className="mt-6 space-y-4">
					<Field>
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							placeholder="Update packages"
							required
						/>
					</Field>

					<Field>
						<div className="flex items-center space-x-2">
							<Checkbox
								id="scheduleEnabled"
								checked={formData.scheduleEnabled}
								onCheckedChange={(checked) =>
									setFormData({
										...formData,
										scheduleEnabled: checked as boolean,
									})
								}
							/>
							<Label htmlFor="scheduleEnabled" className="cursor-pointer">
								Enable Schedule
							</Label>
						</div>
					</Field>

					{formData.scheduleEnabled && (
						<Field>
							<Label htmlFor="cron">Cron Expression</Label>
							<Input
								id="cron"
								value={formData.cron}
								onChange={(e) =>
									setFormData({ ...formData, cron: e.target.value })
								}
								placeholder="0 0 * * *"
								required={formData.scheduleEnabled}
							/>
							<p className="mt-1 text-muted-foreground text-xs">
								Example: 0 0 * * * (daily at midnight)
							</p>
						</Field>
					)}

					<Field>
						<div className="flex items-center space-x-2">
							<Checkbox
								id="continueOnFailure"
								checked={formData.continueOnFailure}
								onCheckedChange={(checked) =>
									setFormData({
										...formData,
										continueOnFailure: checked as boolean,
									})
								}
							/>
							<Label htmlFor="continueOnFailure" className="cursor-pointer">
								Continue on failure
							</Label>
						</div>
					</Field>

					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label>Commands</Label>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={addCommand}
							>
								<Plus className="mr-1 h-4 w-4" />
								Add
							</Button>
						</div>
						{formData.commands.map((command, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: For now we'll use index as key
							<div key={index} className="flex gap-2">
								<Input
									value={command}
									onChange={(e) => updateCommand(index, e.target.value)}
									placeholder="apt update && apt upgrade -y"
									required
								/>
								{formData.commands.length > 1 && (
									<Button
										type="button"
										size="icon"
										variant="ghost"
										onClick={() => removeCommand(index)}
									>
										<Trash className="h-4 w-4" />
									</Button>
								)}
							</div>
						))}
					</div>

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
