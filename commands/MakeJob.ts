import { join } from 'path'
import { BaseCommand, args } from '@adonisjs/ace'

export default class MakeJob extends BaseCommand {
  public static commandName = 'make:job'
  public static description = 'Make a new Bull job'

  /**
   * The name of the job file.
   */
  @args.string({ description: 'Name of the job class' })
  public name: string

  /**
   * Execute command
   */
  public async handle (): Promise<void> {
    const stub = join(__dirname, '..', 'templates', 'job.txt')

    const path = this.application.resolveNamespaceDirectory('jobs')

    this.generator
      .addFile(this.name, { pattern: 'pascalcase', form: 'singular' })
      .stub(stub)
      .destinationDir(path || 'app/Jobs')
      .useMustache()
      .appRoot(this.application.cliCwd || this.application.appRoot)

    await this.generator.run()
  }
}
