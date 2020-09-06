/// <reference path="../../adonis-typings/bull.ts" />

import test from 'japa'
import { join } from 'path'
import { Registrar, Ioc } from '@adonisjs/fold'
import { Config } from '@adonisjs/config/build/standalone'
import { Application } from '@adonisjs/application/build/standalone'
import { BullManager } from '../../src/BullManager'

test.group('Provider', () => {
  test('BullProvider', async (assert) => {
    const ioc = new Ioc()

    ioc.bind('Adonis/Core/Logger', () => console)
    ioc.bind('Adonis/Core/Application', () => {
      return new Application(__dirname, ioc, {}, {})
    })

    ioc.bind(
      'Adonis/Core/Config',
      () =>
        new Config({
          bull: {
            host: '127.0.0.1',
            port: 6379,
            healthCheck: true
          }
        })
    )

    const registrar = new Registrar(ioc, join(__dirname, '../../'))
    await registrar
      .useProviders(['./providers/BullProvider'])
      .registerAndBoot()

    await registrar.boot()

    assert.instanceOf(ioc.use('Rocketseat/Bull'), BullManager)
    assert.deepEqual(ioc.use('Rocketseat/Bull'), ioc.use('Rocketseat/Bull'))
    assert.deepEqual(ioc.use('Rocketseat/Bull'), ioc.use('Bull'))
  })
})
