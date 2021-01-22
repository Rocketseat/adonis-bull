import { join } from 'path'
import { Filesystem } from '@poppinss/dev-utils'
import { Application } from '@adonisjs/core/build/standalone'

import { FakeLogger } from '@adonisjs/logger/build/standalone'

export const fs = new Filesystem(join(__dirname, 'app'))

export class MyFakeLogger extends FakeLogger {
  constructor (public assert, config, pino?) {
    super(config, pino)
  }

  error (message: string) {
    this.assert.isTrue(message.includes('name=TestBull-name id='))
  }
}

export async function setupApplication (environment: 'web' | 'repl' | 'test' = 'test') {
  await fs.add('.env', '')

  await fs.add(
    'config/app.ts',
    `
    export const appKey = 'averylong32charsrandomsecretkey'
    export const http = {
        cookie: {},
        trustProxy: () => true,
    }
    `
  )

  await fs.add('app/Jobs/SomeJob.ts',
  `
    export default class SomeJob {
      public key = 'SomeJob-key'
    
      public async handle () {
        return 'good luck'
      }
    }  
  `)

  await fs.add('start/jobs.ts',
  `
    export default ['App/SomeJob']
  `)

  await fs.add('config/bull.ts',
    `
    import { BullConfig } from '@ioc:Rocketseat/Bull'

    const bullConfig  = {
        connection: 'local',
        
        connections: {
            local: {
              host: 'localhost',
              port: 6379,
              password: '',
              db: 0,
              keyPrefix: '',
            },
        },
    } as unknown as BullConfig

    export default bullConfig
    `)

  const app = new Application(fs.basePath, environment, {
    providers: [
      '@adonisjs/core',
      '../../providers/BullProvider'
    ]
  })

  app.setup()
  app.registerProviders()
  await app.bootProviders()

  return app
}
