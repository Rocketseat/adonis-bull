import { IocContract } from '@adonisjs/fold'
import { LoggerContract } from '@ioc:Adonis/Core/Logger'

import {
  BullManagerContract,
  JobContract,
  QueueContract,
  BullConfig,
  EventListener,
} from '@ioc:Rocketseat/Bull'

import {
  Queue,
  QueueScheduler,
  JobsOptions,
  Job as BullJob,
  Worker,
  WorkerOptions,
  Processor,
} from 'bullmq'
import * as BullBoard from 'bull-board'

export class BullManager implements BullManagerContract {
  constructor(
    protected container: IocContract,
    protected Logger: LoggerContract,
    protected config: BullConfig,
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

      const queueConfig = {
        connection: this.config.connections[this.config.connection],
        ...jobDefinition.queueOptions,
      }

      const jobListeners = this._getEventListener(jobDefinition)

      // eslint-disable-next-line no-new
      new QueueScheduler(jobDefinition.key, queueConfig)

      queues[jobDefinition.key] = Object.freeze({
        bull: new Queue(jobDefinition.key, queueConfig),
        ...jobDefinition,
        instance: jobDefinition,
        listeners: jobListeners,
        boot: jobDefinition.boot,
      })

      return queues
    }, {})

    return this.queues
  }

  private _getEventListener(job: JobContract): EventListener[] {
    const jobListeners = Object.getOwnPropertyNames(
      Object.getPrototypeOf(job)
    ).reduce((events, method: string) => {
      if (method.startsWith('on')) {
        const eventName = method
          .replace(/^on(\w)/, (_, group) => group.toLowerCase())
          .replace(/([A-Z]+)/, (_, group) => ` ${group.toLowerCase()}`)

        events.push({ eventName, method })
      }

      return events
    }, [] as EventListener[])

    return jobListeners
  }

  public getByKey(key: string): QueueContract {
    return this.queues[key]
  }

  public add<T>(
    key: string,
    data: T,
    jobOptions?: JobsOptions
  ): Promise<BullJob<any, any>> {
    return this.getByKey(key).bull.add(key, data, jobOptions)
  }

  public schedule<T = any>(
    key: string,
    data: T,
    date: number | Date,
    options?: JobsOptions
  ) {
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

  /* istanbul ignore next */
  public ui(port = 9999) {
    BullBoard.setQueues(
      Object.keys(this.queues).map(
        (key) => new BullBoard.BullMQAdapter(this.getByKey(key).bull)
      )
    )

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
      const jobDefinition = this.getByKey(key)

      if (typeof jobDefinition.boot !== 'undefined') {
        jobDefinition.boot(jobDefinition.bull)
      }

      const workerOptions: WorkerOptions = {
        concurrency: jobDefinition.concurrency ?? 1,
        connection: this.config.connections[this.config.connection],
        ...jobDefinition.workerOptions,
      }

      const processor: Processor = async (job) => {
        try {
          return await jobDefinition.instance.handle(job)
        } catch (error) {
          await this.handleException(error, job)
          return Promise.reject(error)
        }
      }

      const worker = new Worker(key, processor, workerOptions)

      jobDefinition.listeners.forEach(function (item) {
        worker.on(
          item.eventName,
          jobDefinition.instance[item.method].bind(jobDefinition.instance)
        )
      })

      const shutdown = () =>
        Promise.all([jobDefinition.bull.close(), worker.close()])

      return shutdown
    })

    this._shutdowns = [...this._shutdowns, ...shutdowns]

    return this
  }

  private async handleException(error, job) {
    try {
      const resolver = this.container.getResolver(
        undefined,
        'exceptions',
        'App/Exceptions'
      )

      const resolvedPayload = resolver.resolve('BullHandler.handle')

      await resolver.call(resolvedPayload, undefined, [error, job])
    } catch (err) {
      this.Logger.error(`name=${job.name} id=${job.id}`)
    }
  }

  public async shutdown() {
    await Promise.all(this._shutdowns.map((shutdown) => shutdown()))
  }
}
