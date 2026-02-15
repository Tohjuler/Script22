import z from "zod/v4";

export const jobConfig = z.object({
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

export type JobConfig = z.infer<typeof jobConfig>;
