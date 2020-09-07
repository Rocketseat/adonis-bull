/// <reference path="../../adonis-typings/bull.ts" />

import test from 'japa'
import { join } from 'path'
import { Registrar, Ioc } from '@adonisjs/fold'
import { Application } from '@adonisjs/application/build/standalone'
import { BullManager } from '../../src/BullManager'
import { RedisManager } from '@adonisjs/redis/build/src/RedisManager'
import { Emitter } from '@adonisjs/events/build/standalone'

test.group('Provider', () => {
  test('BullProvider', async (assert) => {
    const ioc = new Ioc()

    ioc.bind('Adonis/Core/Logger', () => console)
    ioc.bind('Adonis/Core/Application', () => {
      return new Application(__dirname, ioc, {}, {})
    })
    ioc.bind('Adonis/Addons/Redis', () => {
      return new RedisManager(
        ioc,
        {
          connection: 'primary',
          connections: {
            primary: {
              host: '127.0.0.1',
              port: 6379,
              healthCheck: true
            }
          }
        } as any,
        new Emitter(ioc)
      )
    })

    const registrar = new Registrar(ioc, join(__dirname, '../../'))
    await registrar.useProviders(['./providers/BullProvider']).registerAndBoot()

    await registrar.boot()

    assert.instanceOf(ioc.use('Rocketseat/Bull'), BullManager)
    assert.deepEqual(ioc.use('Rocketseat/Bull'), ioc.use('Rocketseat/Bull'))
    assert.deepEqual(ioc.use('Rocketseat/Bull'), ioc.use('Bull'))
  })
})
