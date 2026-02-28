import { yaml as yamlLang } from "@codemirror/lang-yaml";
import CodeMirror from "@uiw/react-codemirror";
import yaml from "js-yaml";
import React, { useState } from "react";
import z from "zod";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "./ui/alert";

export function SimpleYamlEditor({
	value,
	onValueChange,
	zodType,
	...props
}: {
	value: string;
	onValueChange: (val: string) => void;
	zodType: z.ZodType;
	id?: string;
	className?: string;
	placeholder?: string;
}) {
	const [error, setError] = useState<string | null>(null);

	const onChange = React.useCallback(
		(val: string) => {
			onValueChange(val);

			try {
				const config = yaml.load(val);

				const res = zodType.safeParse(config);

				if (!res.success) {
					setError(z.prettifyError(res.error));
				} else {
					setError(null);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : `${err}`);
			}
		},
		[onValueChange, zodType],
	);

	return (
		<div className="w-full max-w-2xl space-y-4">
			<Card className="overflow-hidden border-input py-3 [&_.cm-gutters]:bg-card! [&_.ͼo]:bg-card!">
				<CodeMirror
					placeholder={props.placeholder}
					id={props.id}
					value={value}
					extensions={[yamlLang()]}
					onChange={onChange}
					theme="dark"
					className={cn("bg-card! text-sm", props.className)}
				/>
			</Card>

			{error && (
				<Alert variant="destructive">
					<AlertDescription className="font-mono text-xs">
						{error.split("\n").map((s, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: No altertive here
							<p key={i} className="mb-0!">
								{s}
							</p>
						))}
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
