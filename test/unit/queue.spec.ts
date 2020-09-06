/// <reference path="../../adonis-typings/bull.ts" />

import test from 'japa'
import { Ioc } from '@adonisjs/fold'
import { BullManager } from '../../src/BullManager'
import { FakeLogger } from '@adonisjs/logger/build/standalone'
import { LoggerContract } from '@ioc:Adonis/Core/Logger'
import { JobContract } from '@ioc:Rocketseat/Bull'
import { BullExceptionHandler } from '../../src/BullExceptionHandler'
import { Job } from 'bullmq'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test.group('Bull', () => {
  test('should add a new job', async (assert) => {
    const ioc = new Ioc()

    ioc.bind('App/Jobs/TestBull', () => ({
      key: 'TestBull-name',
      concurrency: 2,
      async handle () {}
    }))

    const config = {
      host: '127.0.0.1',
      port: 6379,
      healthCheck: true
    }

    const logger = (new FakeLogger({} as any) as unknown) as LoggerContract

    const bull = new BullManager(ioc, logger, config, ['App/Jobs/TestBull'])
    const jobDefinition = ioc.use('App/Jobs/TestBull')
    const data = { test: 'data' }

    const queue = bull.getByKey(jobDefinition.key)
    const job = await bull.add(jobDefinition.key, data)

    assert.isDefined(job)
    assert.equal(jobDefinition.key, job.name)
    assert.deepEqual(data, job.data)
    assert.equal(queue.concurrency, 2)

    await bull.shutdown()
  })

  test('should add a new job with events inside Job class', async (assert) => {
    const ioc = new Ioc()
    assert.plan(1)

    ioc.bind('App/Jobs/TestBull', () => ({
      key: 'TestBull-name',
      concurrency: 2,
      async handle () {},
      boot (queue) {
        assert.isOk(queue)
      }
    }))

    const config = {
      host: '127.0.0.1',
      port: 6379,
      healthCheck: true
    }

    const logger = (new FakeLogger({} as any) as unknown) as LoggerContract

    const bull = new BullManager(ioc, logger, config, ['App/Jobs/TestBull'])
    const jobDefinition = ioc.use('App/Jobs/TestBull')
    const data = { test: 'data' }

    bull.add(jobDefinition.key, data)
    bull.process()
    await bull.shutdown()
  })

  test('should execute the job handler inside Job class', async (assert) => {
    const ioc = new Ioc()
    const expectedResponse = Date.now()

    ioc.singleton('App/Jobs/TestBull', () => {
      return new (class Job implements JobContract {
        public key = 'TestBull-name';
        public async handle () {
          return expectedResponse
        }
      })()
    })

    const config = {
      host: '127.0.0.1',
      port: 6379,
      healthCheck: true
    }

    const logger = (new FakeLogger({} as any) as unknown) as LoggerContract

    const bull = new BullManager(ioc, logger, config, ['App/Jobs/TestBull'])
    const jobDefinition = ioc.use('App/Jobs/TestBull')
    const data = { test: 'data' }

    const queue = bull.getByKey(jobDefinition.key)

    bull.process()

    let job = await bull.add(jobDefinition.key, data)
    await delay(500)

    job = (await queue.bull.getJob(job.id!))!

    assert.deepEqual(
      ioc.use('App/Jobs/TestBull'),
      ioc.use('App/Jobs/TestBull')
    )
    assert.deepEqual(job.data, data)
    assert.deepEqual(job.returnvalue, expectedResponse)

    await bull.shutdown()
  })

  test('should handle the exception raised by the handler inside Job class', async (assert) => {
    const ioc = new Ioc()

    ioc.singleton('App/Jobs/TestBull', () => {
      return new (class Job implements JobContract {
        public key = 'TestBull-name';
        public async handle () {
          throw new Error('Error with the current job')
        }
      })()
    })

    const config = {
      host: '127.0.0.1',
      port: 6379,
      healthCheck: true
    }

    const logger = (new FakeLogger({} as any) as unknown) as LoggerContract

    class FakeExceptionHandler extends BullExceptionHandler {
      constructor () {
        super(logger)
      }

      async handle (error: Error, job: Job) {
        assert.equal(error.message, 'Error with the current job')
        assert.isDefined(job)
      }
    }

    ioc.bind('App/Exceptions/BullHandler', () => new FakeExceptionHandler())

    const bull = new BullManager(ioc, logger, config, ['App/Jobs/TestBull'])
    const jobDefinition = ioc.use('App/Jobs/TestBull')
    const data = { test: 'data' }

    const queue = bull.getByKey(jobDefinition.key)

    bull.process()

    let job = await bull.add(jobDefinition.key, data)
    await delay(500)

    assert.plan(5)

    job = (await queue.bull.getJob(job.id!))!

    assert.deepEqual(
      ioc.use('App/Jobs/TestBull'),
      ioc.use('App/Jobs/TestBull')
    )
    assert.deepEqual(job.data, data)
    assert.isNull(job.returnvalue)

    await bull.shutdown()
  })

  test('should schedule a new job', async (assert) => {
    const ioc = new Ioc()

    ioc.bind(
      'App/Jobs/TestBull',
      () =>
        new (class Job implements JobContract {
          public key = 'TestBull-name';
          public async handle () {}
        })()
    )

    const config = {
      host: '127.0.0.1',
      port: 6379,
      healthCheck: true
    }

    const logger = (new FakeLogger({} as any) as unknown) as LoggerContract

    const bull = new BullManager(ioc, logger, config, ['App/Jobs/TestBull'])
    const jobDefinition = ioc.use('App/Jobs/TestBull')
    const data = { test: 'data' }

    const job = await bull.schedule(jobDefinition.key, data, 1000)

    assert.equal(jobDefinition.key, job.name)
    assert.equal(job.opts.delay, 1000)
    assert.deepEqual(data, job.data)
  })

  test('should not schedule when time is invalid', async (assert) => {
    const ioc = new Ioc()

    ioc.bind('App/Jobs/TestBull', () => ({
      key: 'TestBull-name',
      async handle () {}
    }))

    const config = {
      host: '127.0.0.1',
      port: 6379,
      healthCheck: true
    }

    const logger = (new FakeLogger({} as any) as unknown) as LoggerContract

    const bull = new BullManager(ioc, logger, config, ['App/Jobs/TestBull'])
    const jobDefinition = ioc.use('App/Jobs/TestBull')
    const data = { test: 'data' }

    assert.throw(() => {
      bull.schedule(jobDefinition.key, data, -100)
    }, 'Invalid schedule time')

    await bull.shutdown()
  })
})
