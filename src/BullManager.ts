import { IocContract } from '@adonisjs/fold'
import { LoggerContract } from '@ioc:Adonis/Core/Logger'
import { BullManagerContract, JobContract, QueueContract } from '@ioc:Rocketseat/Bull'
import { Queue, JobsOptions, Job as BullJob, Worker, WorkerOptions } from 'bullmq'
import * as BullBoard from 'bull-board'
import { RedisManagerContract } from '@ioc:Adonis/Addons/Redis'

export class BullManager implements BullManagerContract {
	constructor(
		protected container: IocContract,
		protected Logger: LoggerContract,
		protected Redis: RedisManagerContract,
		protected jobs: string[]
	) {}

	private _queues: { [key: string]: QueueContract }
	private _shutdowns: (() => Promise<any>)[] = []

	private _getQueueNameFromPath(path: string) {
		return path.replace(/^App\/Jobs\//, '')
	}

	public get queues() {
		if (this._queues) {
			return this._queues
		}

		this._queues = this.jobs.reduce((queues, path) => {
			const job: JobContract = this.container.make(path)

			const queueName = job.queueName ?? this._getQueueNameFromPath(path)

			queues[queueName] = {
				bull: new Queue(queueName, {
					connection: this.Redis as any,
					...job.queueOptions,
				}),
				name: queueName,
				handle: job.handle,
				concurrency: job.concurrency || 1,
				options: job.options,
				queueOptions: job.queueOptions,
				workerOptions: job.workerOptions,
			}

			return queues
		}, {})

		return this.queues
	}

	public getByKey(key: string): QueueContract {
		return this._queues[key]
	}

	public add<T>(name: string, data: T, jobOptions?: JobsOptions): Promise<BullJob<any, any>> {
		return this.getByKey(name).bull.add(name, data, jobOptions)
	}

	public schedule<T = any>(name: string, data: T, date: number | Date, options?: JobsOptions) {
		const delay = typeof date === 'number' ? date : date.getTime() - Date.now()

		if (delay <= 0) {
			throw new Error('Invalid schedule time')
		}

		return this.add(name, data, { ...options, delay })
	}

	public async remove(name: string, jobId: string): Promise<void> {
		const job = await this.getByKey(name).bull.getJob(jobId)
		return job?.remove()
	}

	public ui(port = 9999) {
		BullBoard.setQueues(Object.keys(this.queues).map((name) => this.getByKey(name).bull))

		const server = BullBoard.router.listen(port, () => {
			this.Logger.info(`bull board on http://localhost:${port}`)
		})

		const shutdown = async () => {
			await server.close(() => {
				this.Logger.info('Stopping bull board server')
			})
		}

		this._shutdowns = [...this._shutdowns, shutdown]
	}

	public process() {
		this.Logger.info('Queue processing started')

		const shutdowns = Object.keys(this.queues).map((name) => {
			const queue = this.getByKey(name)

			if (typeof queue.boot !== 'undefined') {
				queue.boot(queue.bull)
			}

			const workerOptions: WorkerOptions = {
				concurrency: queue.concurrency,
				connection: this.Redis as any,
				...queue.workerOptions,
			}

			const processor = async (job: BullJob) => {
				await queue.handle(job)
			}

			const worker = new Worker(name, processor, workerOptions)

			const shutdown = () => Promise.all([queue.bull.close(), worker.close()])

			return shutdown
		})

		this._shutdowns = [...this._shutdowns, ...shutdowns]

		return this
	}

	public async shutdown() {
		await Promise.all(this._shutdowns.map((shutdown) => shutdown()))
	}
}
