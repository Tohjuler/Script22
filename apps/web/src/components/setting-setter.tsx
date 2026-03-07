import type { Keys, SettingTypes } from "@/lib/settings";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";

export default function SettingsSetter({
	settingKey: key,
	value,
	setting,
	onChange,
}: {
	settingKey: Keys;
	value: string;
	setting: { type: SettingTypes; password?: boolean, placeholder?: string };
	onChange: (value: string) => void;
}) {
	switch (setting.type as SettingTypes) {
		case "boolean": {
			return (
				<Switch
					className="float-right"
					defaultChecked={value === "true"}
					id={key}
					onCheckedChange={(val) => onChange(val ? "true" : "false")}
				/>
			);
		}

		case "string": {
			return (
				<Input
					placeholder={
						value === "HIDDEN" ? "Leave blank to keep current value" : setting.placeholder ?? undefined
					}
					defaultValue={value === "HIDDEN" ? "" : value}
					id={key}
					onBlur={(e) => onChange(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") onChange(e.currentTarget.value);
					}}
					type={setting.password ? "password" : "text"}
				/>
			);
		}

		case "full-string": {
			return (
				<Textarea
					placeholder={
						value === "HIDDEN" ? "Leave blank to keep current value" : setting.placeholder ?? undefined
					}
					defaultValue={value === "HIDDEN" ? "" : value}
					id={key}
					onBlur={(e) => onChange(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") onChange(e.currentTarget.value);
					}}
				/>
			);
		}

		case "number": {
			return (
				<Input
					placeholder={
						value === "HIDDEN" ? "Leave blank to keep current value" : setting.placeholder ?? undefined
					}
					defaultValue={value === "HIDDEN" ? "" : Number(value)}
					id={key}
					onBlur={(e) => onChange(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") onChange(e.currentTarget.value);
					}}
					type="number"
				/>
			);
		}

		default: {
			return <p>Unknown setting type: {setting.type}</p>;
		}
	}
}
