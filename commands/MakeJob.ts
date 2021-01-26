import { join } from 'path'
import fs from 'fs'
import { BaseCommand, args } from '@adonisjs/core/build/standalone'
import { StringTransformer } from '@adonisjs/ace/build/src/Generator/StringTransformer'

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
  public async run(): Promise<void> {
    const stub = join(__dirname, '..', 'templates', 'job.txt')
    const jobName = new StringTransformer(this.name)
      .changeCase('pascalcase')
      .changeForm('singular')
      .toValue()

    const path = this.application.resolveNamespaceDirectory('jobs')
    const rootDir = this.application.cliCwd || this.application.appRoot

    const jobPath = join(path || 'app/Jobs', `${jobName}.ts`)

    const exist = fs.existsSync(jobPath)

    if (exist) {
      this.logger.action('create').skipped(jobPath, 'File already exists')

      return
    }

    this.generator
      .addFile(jobName)
      .stub(stub)
      .destinationDir(path || 'app/Jobs')
      .useMustache()
      .appRoot(rootDir)

    await this.generator.run()

    const startFolder = this.application.resolveNamespaceDirectory('start')
    const jobsPath = join(startFolder || 'start', 'jobs.ts')

    const jobsAlreadyExists = fs.existsSync(jobsPath)

    this.generator.clear()

    const stubStart = join(__dirname, '..', 'templates', 'start.txt')

    let startJobs = [`App/Jobs/${jobName}`]

    if (jobsAlreadyExists) {
      const currentJobs = (await import(join(rootDir, jobsPath))).default
      startJobs = currentJobs.concat(startJobs)

      fs.unlinkSync(jobsPath)
    }

    this.generator
      .addFile('jobs.ts')
      .stub(stubStart)
      .destinationDir(startFolder || 'start')
      .useMustache()
      .apply({ startJobs })
      .appRoot(this.application.cliCwd || this.application.appRoot)

    await this.generator.run()
  }
}
