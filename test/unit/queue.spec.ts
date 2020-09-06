/// <reference path="../../adonis-typings/bull.ts" />

import test from 'japa'
import { Ioc } from '@adonisjs/fold'
import { BullManager } from '../../src/BullManager'
import { FakeLogger } from '@adonisjs/logger/build/standalone'
import { RedisManager } from '@adonisjs/redis/build/src/RedisManager'
import { Emitter } from '@adonisjs/events/build/standalone'
import { RedisManagerContract } from '@ioc:Adonis/Addons/Redis'
import { LoggerContract } from '@ioc:Adonis/Core/Logger'

// const delay = require('delay')
// const { ioc, registrar, resolver } = require('@adonisjs/fold')
// const path = require('path')
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
test.group('Bull', () => {
	test('should add a new job', async (assert) => {
		const ioc = new Ioc()

		ioc.bind('App/Jobs/TestBull', () => ({
			queueName: 'TestBull-name',
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

		const queue = bull.getByKey(jobDefinition.queueName)
		const job = await bull.add(jobDefinition.queueName, data)

		assert.isDefined(job)
		assert.equal(jobDefinition.queueName, job.name)
		assert.deepEqual(data, job.data)
		assert.equal(queue.concurrency, 2)

		await redis.quit('primary')
	})

	test('should add a new job with events inside Job class', async (assert) => {
		assert.plan(1)
		const ioc = new Ioc()

		ioc.bind('App/Jobs/TestBull', () => {
			return class {
				public queueName = 'TestBull-name'

				public concurrency = 2

				public async handle() {}

				public async boot(queue) {
					assert.ok(queue)
				}
			}
		})

		ioc.bind('Adonis/Core/Logger', () => new FakeLogger({} as any))
		ioc.bind('Adonis/Addons/Redis', () => new RedisManager(ioc, {} as any, {} as any))

		const loggerInstance = ioc.use('Adonis/Core/Logger')
		const Redis = ioc.use('Adonis/Addons/Redis')

		const bull = new BullManager(ioc, loggerInstance, Redis, ['App/Jobs/TestBull'])
		const Job = ioc.use('App/Jobs/TestBull')
		const data = { test: 'data' }

		bull.add(Job.key, data)
		bull.process()

		await delay(1050)
	})

	test('should schedule a new job', async (assert) => {
		const ioc = new Ioc()

		ioc.bind('App/Jobs/TestBull', () => {
			return class {
				public queueName = 'TestBull-name'

				public async handle() {}
			}
		})

		ioc.bind('Adonis/Core/Logger', () => new FakeLogger({} as any))
		ioc.bind('Adonis/Addons/Redis', () => new RedisManager(ioc, {} as any, {} as any))

		const loggerInstance = ioc.use('Adonis/Core/Logger')
		const Redis = ioc.use('Adonis/Addons/Redis')

		const bull = new BullManager(ioc, loggerInstance, Redis, ['App/Jobs/TestBull'])
		const Job = ioc.use('App/Jobs/TestBull')
		const data = { test: 'data' }

		const job = await bull.schedule(Job.key, data, 1000)

		assert.equal(Job.key, job.name)
		assert.equal(job.opts.delay, 1000)
		assert.deepEqual(data, job.data)
	})

	test("shouldn't schedule when time is invalid", async (assert) => {
		assert.plan(1)
		const ioc = new Ioc()

		ioc.bind('App/Jobs/TestBull', () => {
			return class {
				public queueName = 'TestBull-name'

				public async handle() {}
			}
		})

		ioc.bind('Adonis/Core/Logger', () => new FakeLogger({} as any))
		ioc.bind('Adonis/Addons/Redis', () => new RedisManager(ioc, {} as any, {} as any))

		const loggerInstance = ioc.use('Adonis/Core/Logger')
		const Redis = ioc.use('Adonis/Addons/Redis')

		const bull = new BullManager(ioc, loggerInstance, Redis, ['App/Jobs/TestBull'])
		const Job = ioc.use('App/Jobs/TestBull')
		const data = { test: 'data' }

		try {
			await bull.schedule(Job.key, data, -100)
		} catch (err) {
			assert.equal('Invalid schedule time', err.message)
		}
	})
})
