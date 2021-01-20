import { join } from 'path'
import * as sinkStatic from '@adonisjs/sink'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

function getStub (...relativePaths: string[]) {
  return join(__dirname, 'templates', ...relativePaths)
}

export default async function instructions (
  projectRoot: string,
  app: ApplicationContract,
  sink: typeof sinkStatic
) {
  const configPath = app.configPath('bull.ts')
  const bullConfig = new sink.files.MustacheFile(projectRoot, configPath, getStub('config.txt'))

  bullConfig.overwrite = true

  bullConfig.commit()

  const configDir = app.directoriesMap.get('config') || 'config'
  sink.logger.action('create').succeeded(`${configDir}/bull.ts`)

  const contractsPath = app.makePath('contracts/bull.ts')
  const bullContract = new sink.files.MustacheFile(projectRoot, contractsPath, getStub('contract.txt'))
  bullContract.overwrite = true

  bullContract.commit()

  sink.logger.action('create').succeeded('contracts/bull.ts')

  const startsPath = app.makePath('start/jobs.ts')
  const bullStart = new sink.files.MustacheFile(projectRoot, startsPath, getStub('start.txt'))
  bullStart.overwrite = true

  bullStart.apply({
    startJobs: []
  }).commit()

  sink.logger.action('create').succeeded('start/jobs.ts')
}
