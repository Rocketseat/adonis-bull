'use strict'

const { Command } = require('@adonisjs/ace')

class Listen extends Command {
  static get inject() {
    return ['Rocketseat/Bull']
  }

  constructor(Bull) {
    super()
    this.Bull = Bull
  }

  static get signature() {
    return `
      bull:listen
      { --board?=false : Run bull's dashboard }
      { --board-hostname?=@value : Dashboard hostname }
      { --board-port?=@value : Dashboard port }
    `
  }

  static get description() {
    return 'Start the Bull listener'
  }

  async handle(args, { board = false, boardHostname = 'localhost', boardPort = 9999 }) {
    this.Bull.process()
    if (board) {
      this.Bull.ui(boardPort, boardHostname)
    }
  }
}

module.exports = Listen
