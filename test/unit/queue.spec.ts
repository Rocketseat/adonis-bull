/// <reference path="../../adonis-typings/bull.ts" />

import test from 'japa'
import { Ioc } from '@adonisjs/fold'
import { BullManager } from '../../src/BullManager'
import { FakeLogger } from '@adonisjs/logger/build/standalone'
import { RedisManager } from '@adonisjs/redis/build/src/RedisManager'
import { Emitter } from '@adonisjs/events/build/standalone'
import { RedisManagerContract } from '@ioc:Adonis/Addons/Redis'
import { LoggerContract } from '@ioc:Adonis/Core/Logger'

test.group('Bull', () => {
  test('should add a new job', async (assert) => {
    const ioc = new Ioc()

    ioc.bind('App/Jobs/TestBull', () => ({
      key: 'TestBull-name',
      concurrency: 2,
      async handle() {},
    }))

    const redis = (new RedisManager(
      ioc,
      {
        connection: 'primary',
        connections: {
          primary: {
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
            healthCheck: true,
          },
        },
      } as any,
      new Emitter(ioc)
    ) as unknown) as RedisManagerContract

    const logger = (new FakeLogger({} as any) as unknown) as LoggerContract

    const bull = new BullManager(ioc, logger, redis, ['App/Jobs/TestBull'])
    const jobDefinition = ioc.use('App/Jobs/TestBull')
    const data = { test: 'data' }

    const queue = bull.getByKey(jobDefinition.key)
    const job = await bull.add(jobDefinition.key, data)

    assert.isDefined(job)
    assert.equal(jobDefinition.key, job.name)
    assert.deepEqual(data, job.data)
    assert.equal(queue.concurrency, 2)

    await redis.quit('primary')
  })

  test('should add a new job with events inside Job class', async (assert) => {
    const ioc = new Ioc()
    assert.plan(1)

    ioc.bind('App/Jobs/TestBull', () => ({
      key: 'TestBull-name',
      concurrency: 2,
      async handle() {},
      boot(queue) {
        assert.isOk(queue)
      },
    }))

    const redis = (new RedisManager(
      ioc,
      {
        connection: 'primary',
        connections: {
          primary: {
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
            healthCheck: true,
          },
        },
      } as any,
      new Emitter(ioc)
    ) as unknown) as RedisManagerContract

    const logger = (new FakeLogger({} as any) as unknown) as LoggerContract

    const bull = new BullManager(ioc, logger, redis, ['App/Jobs/TestBull'])
    const jobDefinition = ioc.use('App/Jobs/TestBull')
    const data = { test: 'data' }

    bull.add(jobDefinition.key, data)
    bull.process()
  })

  test('should schedule a new job', async (assert) => {
    const ioc = new Ioc()

    ioc.bind('App/Jobs/TestBull', () => ({
      key: 'TestBull-name',
      async handle() {},
    }))

    const redis = (new RedisManager(
      ioc,
      {
        connection: 'primary',
        connections: {
          primary: {
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
            healthCheck: true,
          },
        },
      } as any,
      new Emitter(ioc)
    ) as unknown) as RedisManagerContract

    const logger = (new FakeLogger({} as any) as unknown) as LoggerContract

    const bull = new BullManager(ioc, logger, redis, ['App/Jobs/TestBull'])
    const jobDefinition = ioc.use('App/Jobs/TestBull')
    const data = { test: 'data' }

    const job = await bull.schedule(jobDefinition.key, data, 1000)

    assert.equal(jobDefinition.key, job.name)
    assert.equal(job.opts.delay, 1000)
    assert.deepEqual(data, job.data)
  })

  test("shouldn't schedule when time is invalid", async (assert) => {
    const ioc = new Ioc()

    ioc.bind('App/Jobs/TestBull', () => ({
      key: 'TestBull-name',
      async handle() {},
    }))

    const redis = (new RedisManager(
      ioc,
      {
        connection: 'primary',
        connections: {
          primary: {
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
            healthCheck: true,
          },
        },
      } as any,
      new Emitter(ioc)
    ) as unknown) as RedisManagerContract

    const logger = (new FakeLogger({} as any) as unknown) as LoggerContract

    const bull = new BullManager(ioc, logger, redis, ['App/Jobs/TestBull'])
    const jobDefinition = ioc.use('App/Jobs/TestBull')
    const data = { test: 'data' }

    assert.throw(() => {
      bull.schedule(jobDefinition.key, data, -100)
    }, 'Invalid schedule time')
  })
})
