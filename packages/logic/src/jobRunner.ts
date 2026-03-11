import { db } from "@script22/db";
import { env } from "@script22/env/server";
import { logger } from "./logger";
import { createJob, type Job, type QueuedJob, requeueJob } from "./runner/job";

const runningJobs: Job[] = [];
const queue: QueuedJob[] = [];

export async function queueJob(
	serverId: number,
	jobId: number,
): Promise<number> {
	const job = await createJob(serverId, jobId);
	queue.push(job);
	logger.debug(
		"Job ID %d queued for server ID %d. Running jobs: %d, Queued jobs: %d",
		jobId,
		serverId,
		runningJobs.length,
		queue.length,
	);

	processQueue().catch((err) => {
		logger.error(
			"Failed to process job queue after adding job ID %d for server ID %d: %s",
			jobId,
			serverId,
			err.message,
		);
	});
	return job.id;
}

export async function createQueueFromDB() {
	const jobs = await db.query.jobRun.findMany({
		columns: { id: true, jobId: true, serverId: true },
		where: (jobRun, { eq }) => eq(jobRun.state, "pending"),
	});

	for (const job of jobs) {
		requeueJob(job.id).catch((err) => {
			logger.error(
				"Failed to requeue job ID %d for server ID %d from DB: %s",
				job.jobId,
				job.serverId,
				err.message,
			);
		});
	}
	logger.info(
		"Loaded %d pending jobs from database into the queue",
		jobs.length,
	);
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

export async function checkJobTimeouts() {
	const maxTime = env.JOB_RUNNER_JOB_TIMEOUT * 60 * 1000;

	for (const job of runningJobs) {
		if (Date.now() - job.startedAt.getTime() > maxTime) {
			try {
				await job.cancel("Job timed out");
				logger.warn("Job ID %d timed out and was cancelled", job.id);
			} catch (err) {
				logger.error(
					"Failed to cancel timed-out job ID %d: %s",
					job.id,
					err instanceof Error ? err.message : String(err),
				);
			}
		}
	}
}

export async function onJobEnd(runId: number) {
	logger.debug("Job ID %d has ended. Removing from running jobs.", runId);
	const idx = runningJobs.findIndex((j) => j.id === runId);
	if (idx === -1) {
		logger.warn("Job ID %d ended but was not found in running jobs.", runId);
		return;
	}

	runningJobs.splice(idx, 1);
	processQueue();
}
