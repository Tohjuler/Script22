import { yaml as yamlLang } from "@codemirror/lang-yaml";
import { useMutation } from "@tanstack/react-query";
import CodeMirror from "@uiw/react-codemirror";
import { EditIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { client, queryClient } from "@/utils/orpc";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface JobConfigProps {
	job: {
		id: number;
		config: string;
	};
}

export default function JobConfig({ job }: JobConfigProps) {
	const [config, setConfig] = useState(job.config);
	const [editing, setEditing] = useState(false);

	const updateMutation = useMutation({
		mutationFn: (input: { id: number; config: string }) =>
			client.jobs.update(input),
		onSuccess: () => {
			toast.success("Job updated successfully");
			queryClient.invalidateQueries({ queryKey: ["jobs"] });
			setEditing(false);
		},
		onError: (error: Error) => {
			toast.error(`Failed to update job: ${error.message}`);
		},
	});

	return (
		<Card className="h-full">
			<CardHeader>
				<CardTitle>Configuration</CardTitle>
				<div className="ml-auto space-x-2">
					{editing ? (
						<>
							<Button
								size="icon"
								variant="ghost"
								onClick={() => {
									setConfig(job.config);
									setEditing(false);
								}}
								className="mr-2"
							>
								<XIcon />
							</Button>
							<Button
								size="sm"
                                variant="active"
								onClick={() => updateMutation.mutate({ id: job.id, config })}
							>
								Save
							</Button>
						</>
					) : (
						<Button
							size="icon"
							variant="ghost"
							onClick={() => setEditing(true)}
						>
							<EditIcon />
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent>
				<CodeMirror
					value={config}
					extensions={[yamlLang()]}
					theme="dark"
					className="bg-card! font-mono text-sm"
					readOnly={!editing}
				/>
			</CardContent>
		</Card>
	);
}
