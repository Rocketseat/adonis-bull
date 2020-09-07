import { IocContract } from '@adonisjs/fold'
import { BullManagerContract } from '@ioc:Rocketseat/Bull'

/**
 * Provider to bind bull to the container
 */
export default class BullProvider {
  constructor(protected container: IocContract) {}

  public register() {
    this.container.singleton('Rocketseat/Bull', () => {
      const app = this.container.use('Adonis/Core/Application')
      const Logger = this.container.use('Adonis/Core/Logger')
      const Redis = this.container.use('Adonis/Addons/Redis')

      const jobs = require(app.startPath('jobs'))?.default || []
      const { BullManager } = require('../src/BullManager')

      return new BullManager(this.container, Logger, Redis, jobs)
    })

    this.container.alias('Rocketseat/Bull', 'Bull')
  }

  public async boot() {}

  public async ready() {}

  public async shutdown() {
    await this.container.use<BullManagerContract>('Rocketseat/Bull').shutdown()
  }
}
