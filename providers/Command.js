'use strict'

const { ServiceProvider } = require('@adonisjs/fold')

class MigrationsProvider extends ServiceProvider {
  register() {
    this.app.bind('Rocketseat/Commands/Bull:Listen', () =>
      require('../src/Commands/Listen')
    )
  }

  boot() {
    const ace = require('@adonisjs/ace')
    ace.addCommand('Rocketseat/Commands/Bull:Listen')
  }
}

module.exports = MigrationsProvider
