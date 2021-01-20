import { BaseCommand, flags } from '@adonisjs/core/build/standalone'

export default class Listen extends BaseCommand {
  public static commandName = 'bull:listen'
  public static description = 'Start the Bull listener'
  public static settings = {
    loadApp: true,
    stayAlive: true
  }

  /**
   * Start the bull-board
   */
  @flags.boolean({ description: "Run bull's dashboard", alias: 'b' })
  public board: boolean

  /**
   * Custom port for the bull-board
   */
  @flags.number({ description: "Run bull's dashboard in the provided port", alias: 'p' })
  public port: number

  /**
   * Execute command
   */
  public async run (): Promise<void> {
    const bull = this.application.container.use('Rocketseat/Bull')

    console.log({ board: this.board })

    bull.process()

    if (this.board || (typeof this.board === 'undefined' && typeof this.port !== 'undefined')) {
      bull.ui(this.port)
    }
  }
}
