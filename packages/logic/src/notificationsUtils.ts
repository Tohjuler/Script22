import { logger } from "./logger";
import { getSetting } from "./settings";

export async function sendNotification(title: string, message: string) {
	const url = await getSetting("apprise-url");
	const notifyUrl = await getSetting("apprise-notify-url");

	if (!url || !notifyUrl) return;

	const appriseUrl = url.endsWith("/notify")
		? url
		: url.endsWith("/")
			? `${url}notify`
			: `${url}/notify`;

	await fetch(appriseUrl, {
		method: "POST",
		body: JSON.stringify({
			urls: notifyUrl,
			body: message,
			title,
		}),
		headers: {
			"Content-Type": "application/json",
		},
	}).catch((err) => {
		logger.error(err, "Failed to send notifitaion to %s", notifyUrl);
	});
}

export async function sendSuccessNotification(
	serverName: string,
	jobName: string,
    details: {
        exitCode: number;
        time: number;
    }
) {
	const notifyOnSuccess = await getSetting("apprise-notify-on-success", "false");
	if (notifyOnSuccess !== "true") return;

	await sendNotification(
		`Successful job on ${serverName}`,
		`Job ${jobName} completed successfully on server ${serverName} with exit code ${details.exitCode} in ${formatTime(details.time)}`,
	);
}

export async function sendFailureNotification(
    serverName: string,
    jobName: string,
    details: {
        exitCode: number;
        time: number;
    }
) {
	const notifyOnFailure = await getSetting("apprise-notify-on-failure", "true");
	if (notifyOnFailure !== "true") return;

	await sendNotification(
		`Failed job on ${serverName}`,
		`Job ${jobName} failed on server ${serverName} with exit code ${details.exitCode} in ${formatTime(details.time)}`,
	);
}

function formatTime(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	if (hours > 0) {
		return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	}
	if (seconds > 0) {
		return `${seconds}s`;
	}

	return `${ms}ms`;
}
