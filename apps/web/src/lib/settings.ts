export type SettingTypes = "boolean" | "string" | "full-string" | "number";

export type SettingTypeMap<T extends SettingTypes> = T extends "boolean"
	? boolean
	: T extends "string"
		? string
		: T extends "full-string"
			? string
			: T extends "number"
				? number
				: never;

export type SettingType<T extends SettingTypes> = {
	name: string;
	type: T;
	defaultValue: SettingTypeMap<T>;
	description: string;
	placeholder?: string;

	password?: boolean;
	group?: string;
};

export const Settings = {
	"default-ssh-key": {
		name: "Default SSH Key",
		type: "full-string",
		defaultValue: "",
		description:
			"The default SSH private key to use on servers that don't have a specific key set. This should be the full contents of the private key file.",
	} as SettingType<"full-string">,
	"default-ssh-password": {
		name: "Default SSH Password",
		type: "string",
		defaultValue: "",
		description:
			"The default SSH password to use on servers that don't have a specific password set.",
		password: true,
	} as SettingType<"string">,

	// Apprise
	// ---
	"apprise-url": {
		name: "Apprise URL",
		type: "string",
		defaultValue: "",
		description:
			"The URL of your Apprise server, including the protocol (e.g. http://localhost:8000).",
		placeholder: "http://localhost:8000",
		group: "Apprise",
	} as SettingType<"string">,
	"apprise-notify-url": {
		name: "Apprise Notify URL",
		type: "string",
		defaultValue: "",
		description:
			"The apprise notify URL, see https://appriseit.com/services/ for dockumentation on supported services.",
		placeholder: "e.g. discord://{WebhookID}/{WebhookToken}",
		group: "Apprise",
	} as SettingType<"string">,
	"apprise-notify-on-success": {
		name: "Apprise Notify on Success",
		type: "boolean",
		defaultValue: false,
		description:
			"Whether to send a notification through Apprise when a server update succeeds.",
		group: "Apprise",
	} as SettingType<"boolean">,
	"apprise-notify-on-failure": {
		name: "Apprise Notify on Failure",
		type: "boolean",
		defaultValue: true,
		description:
			"Whether to send a notification through Apprise when a server update fails.",
		group: "Apprise",
	} as SettingType<"boolean">,
} as const satisfies Record<string, SettingType<SettingTypes>>;

export type Keys = keyof typeof Settings;
