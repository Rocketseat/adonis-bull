import { join } from 'path'
import { Filesystem } from '@poppinss/dev-utils'
import { Application } from '@adonisjs/core/build/standalone'

export const fs = new Filesystem(join(__dirname, '__app'))

export async function setupApplication (additionalProviders?: string[], environment: 'web' | 'repl' | 'test' = 'test') {
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

  await fs.add('contracts/bull.ts',
    `
    declare module '@ioc:Rocketseat/Bull' {
        interface BullConnectionsList {
            local: BullConnectionContract;
        }
    }
    `)

  await fs.add('config/bull.ts',
    `
    import Env from '@ioc:Adonis/Core/Env'
    import { BullConfig } from '@ioc:Rocketseat/Bull'

    const bullConfig: BullConfig = {
        connection: Env.get('BULL_CONNECTION'),
        
        connections: {
            local: {
            host: Env.get('REDIS_HOST'),
            port: Env.get('REDIS_PORT'),
            password: Env.get('REDIS_PASSWORD', ''),
            db: 0,
            keyPrefix: '',
            },
        },
    }

    export default bullConfig
    `)

  const app = new Application(fs.basePath, environment, {
    aliases: {
      App: './app'
    },
    providers: [
      '@adonisjs/core'
    ].concat(additionalProviders || [])
  })

  app.setup()
  app.registerProviders()
  await app.bootProviders()

  return app
}
