import { env } from "@script22/env/server";
import { logger } from "./logger";
import { createJob, type Job, type QueuedJob } from "./runner/job";

const runningJobs: Job[] = [];
const queue: QueuedJob[] = [];

export async function queueJob(
	serverId: number,
	jobId: number,
): Promise<number> {
	const job = await createJob(serverId, jobId);
	queue.push(job);
	processQueue();
	return job.id;
}

async function processQueue() {
	logger.debug(
		"Processing job queue. Running jobs: %d, Queued jobs: %d",
		runningJobs.length,
		queue.length,
	);
	if (queue.length === 0) return;
	if (runningJobs.length >= env.JOB_RUNNER_CONCURRENCY) return;

	const nextJob = queue.shift()!;
	const job = await nextJob.start();
	runningJobs.push(job);
	logger.debug(
		"Started job ID %d. Running jobs: %d, Queued jobs: %d",
		job.id,
		runningJobs.length,
		queue.length,
	);
}

export async function checkJobTimouts() {
	const maxTime = env.JOB_RUNNER_JOB_TIMEOUT * 60 * 1000;

	for (const job of runningJobs) {
		if (job.getTimeRunning() > maxTime) {
			job.cancel("Job timed out");
			logger.warn("Job ID %d timed out and was cancelled", job.id);
		}
	}
}

export async function onJobEnd(runId: number) {
	logger.debug("Job ID %d has ended. Removing from running jobs.", runId);
	runningJobs.splice(
		runningJobs.findIndex((j) => j.id === runId),
		1,
	);
	processQueue();
}
