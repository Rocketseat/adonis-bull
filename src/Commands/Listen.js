'use strict'

const { Command } = require('@adonisjs/ace')

class Listen extends Command {
  static get inject () {
    return ['Rocketseat/Bull']
  }

  constructor (Bull) {
    super()
    this.Bull = Bull
  }

  static get signature () {
    return `
      bull:listen
      { --board?=@value: Run bull's dashboard }
    `
  }

  static get description () {
    return 'Start the Bull listener'
  }

  async handle (args, { board }) {
    this.Bull.process()
    if (board) {
      const port = typeof board === 'boolean' ? 9999 : Number(board)
      this.Bull.ui(port)
    }
  }
}

module.exports = Listen
