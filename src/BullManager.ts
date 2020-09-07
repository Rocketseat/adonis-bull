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

  public get queues() {
    if (this._queues) {
      return this._queues
    }

    this._queues = this.jobs.reduce((queues, path) => {
      const jobDefinition: JobContract = this.container.make(path)

      queues[jobDefinition.key] = {
        bull: new Queue(jobDefinition.key, {
          connection: this.Redis as any,
          ...jobDefinition.queueOptions,
        }),
        ...jobDefinition,
      }

      return queues
    }, {})

    return this.queues
  }

  public getByKey(key: string): QueueContract {
    return this.queues[key]
  }

  public add<T>(key: string, data: T, jobOptions?: JobsOptions): Promise<BullJob<any, any>> {
    return this.getByKey(key).bull.add(key, data, jobOptions)
  }

  public schedule<T = any>(key: string, data: T, date: number | Date, options?: JobsOptions) {
    const delay = typeof date === 'number' ? date : date.getTime() - Date.now()

    if (delay <= 0) {
      throw new Error('Invalid schedule time')
    }

    return this.add(key, data, { ...options, delay })
  }

  public async remove(key: string, jobId: string): Promise<void> {
    const job = await this.getByKey(key).bull.getJob(jobId)
    return job?.remove()
  }

  public ui(port = 9999) {
    BullBoard.setQueues(Object.keys(this.queues).map((key) => this.getByKey(key).bull))

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

    const shutdowns = Object.keys(this.queues).map((key) => {
      const queue = this.getByKey(key)

      if (typeof queue.boot !== 'undefined') {
        queue.boot(queue.bull)
      }

      const workerOptions: WorkerOptions = {
        concurrency: queue.concurrency ?? 1,
        connection: this.Redis as any,
        ...queue.workerOptions,
      }

      const processor = async (job: BullJob) => {
        await queue.handle(job)
      }

      const worker = new Worker(key, processor, workerOptions)

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
