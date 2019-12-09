const { ServiceProvider, resolver } = require('@adonisjs/fold')
const path = require('path')

class BullProvider extends ServiceProvider {
  register () {
    this.app.singleton('Rocketseat/Bull', (app) => {
      const Queue = require('../src/Queue')
      const Helpers = app.use('Adonis/Src/Helpers')
      const Logger = app.use('Adonis/Src/Logger')
      const Config = app.use('Adonis/Src/Config')

      const jobs = require(path.join(Helpers.appRoot(), 'start/jobs.js')) || []

      return new Queue(Logger, Config, jobs, app, resolver)
    })

    this.app.alias('Rocketseat/Bull', 'Bull')
  }
}

module.exports = BullProvider
