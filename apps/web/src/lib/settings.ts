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
    password?: boolean;
};

export const Settings = {
	"default-ssh-key": {
		name: "Default SSH Key",
		type: "full-string",
		defaultValue: "",
        description: "The default SSH private key to use on servers that don't have a specific key set. This should be the full contents of the private key file.",
	} as SettingType<"full-string">,
    "default-ssh-password": {
        name: "Default SSH Password",
        type: "string",
        defaultValue: "",
        description: "The default SSH password to use on servers that don't have a specific password set.",
        password: true,
    } as SettingType<"string">,
} as const satisfies Record<string, SettingType<SettingTypes>>;

export type Keys = keyof typeof Settings;
