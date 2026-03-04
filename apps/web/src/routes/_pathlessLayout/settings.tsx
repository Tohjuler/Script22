import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import SettingsSetter from "@/components/setting-setter";
import { Label } from "@/components/ui/label";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { type Keys, Settings } from "@/lib/settings";
import { client, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_pathlessLayout/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const { data: settingsData, isPending } = useQuery({
		queryKey: ["settings", "getAll"],
		queryFn: () => client.settings.getAll(),
	});

	const updateSettingMutation = useMutation({
		mutationFn: (input: { key: Keys; value: string }) =>
			client.settings.set(input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });

			toast.success("Setting updated successfully");
		},
		onError: (error: Error) => {
			toast.error(`Failed to update setting: ${error.message}`);
		},
	});

	if (isPending) {
		return <div className="flex-1 p-6">Loading...</div>;
	}

	return (
		<div className="mx-auto my-5 w-2/3 flex-1 rounded-xl border p-4 shadow-md sm:p-6">
			<h2 className="mb-4 font-semibold text-2xl">Settings</h2>
			<hr className="mb-4" />
			<div>
				{Object.entries(Settings).map(([key, setting]) => (
					<div className="flex gap-2 p-2" key={key}>
						<Tooltip>
							<TooltipTrigger asChild>
								<Label
									className="mr-auto underline decoration-dashed"
									htmlFor={key}
								>
									{setting.name}
								</Label>
							</TooltipTrigger>
							<TooltipContent>
								<p>{setting.description}</p>
							</TooltipContent>
						</Tooltip>
						<div className="w-fit min-w-100">
							<SettingsSetter
								setting={setting}
								settingKey={key as Keys}
								value={
									settingsData?.find((s) => s.key === key)?.value ??
									setting.defaultValue.toString()
								}
								onChange={(value) => {
									updateSettingMutation.mutate({
										key: key as Keys,
										value: String(value),
									});
								}}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
