const path = require('path')
const test = require('japa')
const { ioc, registrar, resolver } = require('@adonisjs/fold')
const { Helpers, Config } = require('@adonisjs/sink')

test.group('Provider', group => {
  group.before(async () => {
    resolver.appNamespace('App')
    registrar.providers([
      path.join(__dirname, '../../providers/Bull')
    ]).register()

    ioc.bind('Adonis/Src/Logger', () => {
      return console
    })

    ioc.alias('Adonis/Src/Logger', 'Logger')

    ioc.bind('Adonis/Src/Helpers', () => {
      return new Helpers(__dirname)
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
  })

  group.beforeEach(() => {
    ioc.restore()
  })

  test('BullProvider', async assert => {
    assert.isDefined(ioc.use('Rocketseat/Bull'))
    assert.isTrue(ioc._bindings['Rocketseat/Bull'].singleton)
  })
})
