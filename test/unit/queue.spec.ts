/// <reference path="../../adonis-typings/bull.ts" />

import test from 'japa'
import { Ioc } from '@adonisjs/fold'
import { BullManager } from '../../src/BullManager'

// const clusterNodes = process.env.REDIS_CLUSTER_PORTS!.split(',').map((port) => {
// 	return { host: process.env.REDIS_HOST!, port: Number(port) }
// })
// const delay = require('delay')
// const { ioc, registrar, resolver } = require('@adonisjs/fold')
// const path = require('path')
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
test.group('Bull', () => {
	test('should add a new job', async (assert) => {
		const ioc = new Ioc()

		ioc.bind('App/Jobs/TestBull', () => {
			return class {
				public queueName = 'TestBull-name'

				public concurrency = 2

				public async handle() {}
			}
		})

		const Logger = ioc.use('Adonis/Addons/Logger')
		const Redis = ioc.use('Adonis/Addons/Redis')

		const bull = new BullManager(ioc, Logger, Redis, ['App/Jobs/TestBull'])
		const Job = ioc.use('App/Jobs/TestBull')
		const data = { test: 'data' }

		const queue = bull.getByKey(Job.key)

		const job = await bull.add(Job.key, data)
		assert.equal(Job.key, job.name)
		assert.deepEqual(data, job.data)

		assert.equal(queue.concurrency, 2)
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

		const Logger = ioc.use('Adonis/Addons/Logger')
		const Redis = ioc.use('Adonis/Addons/Redis')

		const bull = new BullManager(ioc, Logger, Redis, ['App/Jobs/TestBull'])
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

		const Logger = ioc.use('Adonis/Addons/Logger')
		const Redis = ioc.use('Adonis/Addons/Redis')

		const bull = new BullManager(ioc, Logger, Redis, ['App/Jobs/TestBull'])
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

		const Logger = ioc.use('Adonis/Addons/Logger')
		const Redis = ioc.use('Adonis/Addons/Redis')

		const bull = new BullManager(ioc, Logger, Redis, ['App/Jobs/TestBull'])
		const Job = ioc.use('App/Jobs/TestBull')
		const data = { test: 'data' }

		try {
			await bull.schedule(Job.key, data, -100)
		} catch (err) {
			assert.equal('Invalid schedule time', err.message)
		}
	})
})
