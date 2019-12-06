const test = require('japa')
const delay = require('delay')
const { ioc, registrar, resolver } = require('@adonisjs/fold')
const { setupResolver, Helpers, Config } = require('@adonisjs/sink')
const path = require('path')

const Queue = require('../../src/Queue')

test.group('Bull', group => {
  group.before(async () => {
    // registrar.before(['@adonisjs/redis/providers/RedisProvider']).register()

    ioc.bind('Adonis/Src/Helpers', () => {
      return new Helpers(path.join(__dirname, '..'))
    })
    ioc.alias('Adonis/Src/Helpers', 'Helpers')

    ioc.bind('Adonis/Src/Config', () => {
      const config = new Config()
      config.set('redis', {
        connection: 'local',
        local: {
          host: '127.0.0.1',
          port: 6379,
          db: 0,
          keyPrefix: ''
        },
        bull: {
          host: '127.0.0.1',
          port: 6379,
          db: 0,
          keyPrefix: 'q'
        }
      })

      config.set('bull', {
        connection: 'bull'
      })

      return config
    })
    ioc.alias('Adonis/Src/Config', 'Config')
    await registrar.boot()
    setupResolver()
  })

  group.beforeEach(() => {
    ioc.restore()
  })

  test('should add a new job', async assert => {
    ioc.bind('Test/Bull', () => {
      return class {
        static get key () {
          return 'TestBull-name'
        }

        static get concurrency () {
          return 2
        }

        async handle () {}
      }
    })

    const bull = new Queue(console, ioc.use('Config'), ['Test/Bull'], ioc, resolver)
    const Job = ioc.use('Test/Bull')
    const data = { test: 'data' }

    const queue = bull.get(Job.key)

    const job = await bull.add(Job.key, data)
    assert.equal(Job.key, job.queue.name)
    assert.deepEqual(data, job.data)

    assert.equal(queue.concurrency, 2)
  })

  test('should add a new job with events inside Job class', async assert => {
    assert.plan(1)
    ioc.bind('Test/Bull', () => {
      return class {
        static get key () {
          return 'TestBull-name'
        }

        onCompleted () {
          assert.isOk()
        }

        async handle () {}
      }
    })

    const bull = new Queue(console, ioc.use('Config'), ['Test/Bull'], ioc, resolver)
    const Job = ioc.use('Test/Bull')
    const data = { test: 'data' }

    bull.add(Job.key, data)
    bull.process()

    await delay(1050)
  })

  test('should schedule a new job', async assert => {
    ioc.bind('Test/Bull', () => {
      return class {
        static get key () {
          return 'TestBull-name'
        }

        async handle () {}
      }
    })

    const bull = new Queue(console, ioc.use('Config'), ['Test/Bull'], ioc, resolver)
    const Job = ioc.use('Test/Bull')
    const data = { test: 'data' }

    const job = await bull.schedule(Job.key, data, '1 second')

    assert.equal(Job.key, job.queue.name)
    assert.equal(job.delay, 1000)
    assert.deepEqual(data, job.data)
  })

  test('shouldn\'t schedule when time is invalid', async assert => {
    assert.plan(1)

    ioc.bind('Test/Bull', () => {
      return class {
        static get key () {
          return 'TestBull-name'
        }

        async handle () {}
      }
    })

    const bull = new Queue(console, ioc.use('Config'), ['Test/Bull'], ioc, resolver)
    const Job = ioc.use('Test/Bull')
    const data = { test: 'data' }

    try {
      await bull.schedule(Job.key, data, 'invalid time')
    } catch (err) {
      assert.equal('Invalid schedule time', err.message)
    }
  })
})
