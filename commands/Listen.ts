import { BaseCommand, Kernel, flags } from '@adonisjs/ace'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { BullManagerContract } from '@ioc:Rocketseat/Bull'

export default class Listen extends BaseCommand {
  public static commandName = 'bull:listen'
  public static description = 'Start the Bull listener'
  constructor (app: ApplicationContract, kernel: Kernel, private bull: BullManagerContract) {
    super(app, kernel)
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
  public port?: number

  /**
   * Execute command
   */
  public async handle (): Promise<void> {
    this.bull.process()

    if (this.board || (typeof this.board === 'undefined' && typeof this.port !== 'undefined')) {
      this.bull.ui(this.port)
    }
  }
}
