declare module '@ioc:Rocketseat/Bull' {
	import { Queue, Processor, JobsOptions, QueueOptions, WorkerOptions, Job } from 'bullmq'

	export interface JobContract<T = any> {
		queueName?: string
		options?: JobsOptions
		workerOptions?: WorkerOptions
		queueOptions?: QueueOptions
		concurrency?: number
		handle(data: T): Promise<any>
		boot?: (queue: Queue) => void
	}

	export interface QueueContract<T = any> {
		bull: Queue<T>
		Job: JobContract
		name: string
		handle: Processor
		boot?: (queue: Queue) => void
		concurrency: number
		workerOptions?: WorkerOptions
		queueOptions?: QueueOptions
		options?: JobsOptions
	}

	export interface BullManagerContract {
		queues: { [key: string]: QueueContract }

		getByKey(key: string): QueueContract

		add<T>(name: string, data: T, jobOptions?: JobsOptions): Promise<Job<any, any>>

		remove(name: string, jobId: string): Promise<void>

		ui(port?: number): void

		shutdown(): Promise<void>

		process(): void
	}

	const Bull: BullManagerContract

	export default Bull
}
