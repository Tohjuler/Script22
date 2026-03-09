import { bunPluginPino } from "bun-plugin-pino";

await Bun.build({
	entrypoints: ["./src/index.ts"],
	outdir: "./dist",
	external: ["cpu-features"],
	sourcemap: true,
	target: "bun",
	plugins: [
		bunPluginPino({
			transports: ["pino-pretty"],
		}),
	],
});
