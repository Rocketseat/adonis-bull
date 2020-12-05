import { IocContract } from '@adonisjs/fold'
import { BullManagerContract } from '@ioc:Rocketseat/Bull'

/**
 * Provider to bind bull to the container
 */
export default class BullProvider {
  constructor (protected container: IocContract) {}

  public register () {
    this.container.bind('Rocketseat/Bull/BullExceptionHandler', () => {
      const { BullExceptionHandler } = require('../src/BullExceptionHandler')
      return BullExceptionHandler
    })

    this.container.singleton('Rocketseat/Bull', () => {
      const app = this.container.use('Adonis/Core/Application')
      const config = this.container.use('Adonis/Core/Config').get('bull', {})
      const Logger = this.container.use('Adonis/Core/Logger')

      const jobs = require(app.startPath('jobs'))?.default || []
      const { BullManager } = require('../src/BullManager')

      return new BullManager(this.container, Logger, config, jobs)
    })

    this.container.alias('Rocketseat/Bull', 'Bull')
  }

  public async shutdown () {
    await this.container.use<BullManagerContract>('Rocketseat/Bull').shutdown()
  }
}
