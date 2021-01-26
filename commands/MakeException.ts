import { join } from 'path'
import { BaseCommand } from '@adonisjs/core/build/standalone'

export default class MakeException extends BaseCommand {
  public static commandName = 'bull:exception'
  public static description = 'Make a Bull exception handle file'

  /**
   * Execute command
   */
  public async run(): Promise<void> {
    const stub = join(__dirname, '..', 'templates', 'handler.txt')

    const path = this.application.resolveNamespaceDirectory('exceptions')
    const rootDir = this.application.cliCwd || this.application.appRoot

    this.generator
      .addFile('BullHandler.ts')
      .stub(stub)
      .destinationDir(path || 'app/Exceptions')
      .useMustache()
      .appRoot(rootDir)

    await this.generator.run()
  }
}
