'use strict'

const Bull = require('bull')
const BullBoard = require('bull-board')
const humanInterval = require('human-interval')

const differenceInMilliseconds = require('date-fns/differenceInMilliseconds')
const parseISO = require('date-fns/parseISO')
const fs = require('fs')

class Queue {
  constructor (Logger, Config, jobs, app, resolver) {
    this.Logger = Logger
    this.jobs = jobs

    this.app = app
    this.resolver = resolver

    this._queues = null

    const { connection, ...connections } = Config.get('bull')

    this.config = connections[connection]
    this.connections = connections
  }

  _getJobListeners (Job) {
    const jobListeners = Object.getOwnPropertyNames(Job.prototype)
      .filter(method => method.startsWith('on'))
      .map(method => {
        const eventName = method
          .replace(/^on(\w)/, (match, group) => group.toLowerCase())
          .replace(/([A-Z]+)/, (match, group) => ` ${group.toLowerCase()}`)

        return { eventName, method }
      })
    return jobListeners
  }

  get queues () {
    if (!this._queues) {
      this._queues = this.jobs.reduce((queues, path) => {
        const Job = this.app.use(path)

        const config = this.config
        if (Job.connection) {
          config.redis = this.connections[Job.connection]
        }

        queues[Job.key] = {
          bull: new Bull(Job.key, config),
          Job,
          name: Job.key,
          handle: Job.handle,
          concurrency: Job.concurrency || 1,
          options: Job.options
        }

        return queues
      }, {})
    }

    return this._queues
  }

  get (name) {
    return this.queues[name]
  }

  add (name, data, options) {
    const queue = this.get(name)

    const job = queue.bull.add(data, { ...queue.options, ...options })

    return job
  }

  schedule (name, data, date, options) {
    let delay

    if (typeof date === 'number' || date instanceof Number) {
      delay = date
    } else {
      if (typeof date === 'string' || date instanceof String) {
        const byHuman = humanInterval(date)
        if (!isNaN(byHuman)) {
          delay = byHuman
        } else {
          delay = differenceInMilliseconds(parseISO(date), new Date())
        }
      } else {
        delay = differenceInMilliseconds(date, new Date())
      }
    }

    if (delay > 0) {
      return this.add(name, data, { ...options, delay })
    } else {
      throw new Error('Invalid schedule time')
    }
  }

  ui (port = 9999) {
    BullBoard.setQueues(Object.values(this.queues).map(queue => queue.bull))

    const { UI } = BullBoard

    const server = UI.listen(port, () => {
      this.Logger.info(`bull board on http://localhost:${port}`)
    })

    const shutdown = () => {
      server.close(() => this.Logger.info('Stopping bull board server'))
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
  }

  async remove (name, jobId) {
    const job = await this.queues[name].bull.getJob(jobId)

    job.remove()
  }

  /* eslint handle-callback-err: "error" */
  handleException (error, job) {
    try {
      const exceptionHandlerFile = this.resolver.forDir('exceptions').getPath('QueueHandler.js')
      fs.accessSync(exceptionHandlerFile, fs.constants.R_OK)

      const namespace = this.resolver.forDir('exceptions').translate('QueueHandler')
      const handler = this.app.make(this.app.use(namespace))
      handler.report(error, job)
    } catch (err) {
      this.Logger.error(`name=${job.queue.name} id=${job.id}`)
    }
  }

  process () {
    this.Logger.info('Queue processing started')
    Object.values(this.queues).forEach(queue => {
      const Job = new queue.Job()

      const jobListeners = this._getJobListeners(queue.Job)

      jobListeners.forEach(function (item) {
        queue.bull.on(item.eventName, Job[item.method].bind(Job))
      })

      queue.bull.process(queue.concurrency, (job, done) => {
        Job.handle(job).then(result => {
          done(null, result)
        }).catch(error => {
          this.handleException(error, job)
          done(error)
        })
      })
    })

    const shutdown = () => {
      Object.values(this.queues).map(queue => {
        queue.bull.close()
      })
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)

    return this
  }
}

module.exports = Queue
