#!/usr/bin/env node

import {
  processArguments,
  createTarball,
  streamToTarGzFile,
  getConfig,
  extractTarball,
  checkAWSConfig
} from './lib/utils.js'
import { promptString, promptBoolean, print } from './lib/cli.js'
import { uploadFile, getUserSecrets, getObject } from './lib/s3.js'

import path from 'path'
import fs from 'fs'
import { configDotenv } from 'dotenv'

configDotenv()

async function init(args) {
  const configPath = path.join(process.cwd(), '.svrc')
  if (
    fs.existsSync(configPath) &&
    !(await promptBoolean(
      'Configuration file already exists. Do you want to overwrite it? (y/N): ',
      false
    ))
  ) {
    return
  }

  const { name, description, projectRoot } = args
  const projectName = name || (await promptString('Enter project name: '))
  const projectDescription =
    description || (await promptString('Enter project description: ', false))
  const projectRootPath =
    projectRoot || (await promptString('Enter project root path: ', false))

  const config = {
    name: projectName,
    description: projectDescription,
    projectRoot: projectRootPath,
    aws: {
      bucket: '',
      region: '',
      accessKeyId: '',
      secretAccessKey: '',
      prefix: ''
    },
    include: []
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  print(`Config file created at ${configPath}.`)
  print('Add files to include in the configuration file and run `svr push`.')
}

async function push() {
  const isAWSConfigValid = checkAWSConfig()
  if (isAWSConfigValid != null) {
    print(isAWSConfigValid)
    return
  }

  const configPath = path.join(process.cwd(), '.svrc')
  if (!fs.existsSync(configPath)) {
    print('Configuration file not found')
    return
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  const { name, projectRoot, include } = config
  if (!name || !projectRoot || !include) {
    print('Invalid configuration file')
    return
  }

  print(`Compressing ${include.length} files...`)
  let tarball
  try {
    tarball = await createTarball(projectRoot, include)
  } catch (e) {
    print(`Error compressing files: ${e.message}`)
    return
  }

  print(`Uploading files...`)
  try {
    await uploadFile(tarball.name, tarball.content)
    print('Files uploaded successfully')

    fs.unlinkSync(tarball.name)
    print('Temporary files removed')
  } catch (e) {
    print(`Error uploading files: ${e.message}`)
  }
}

async function pull() {
  const isAWSConfigValid = checkAWSConfig()
  if (isAWSConfigValid != null) {
    print(isAWSConfigValid)
    print('Please run `svr init` to configure the AWS settings')
    return
  }

  const secrets = await getUserSecrets()

  if (!secrets?.Contents) {
    print('No secrets found')
    return
  }

  const file = secrets.Contents.map((file) => {
    const fileName = path.basename(file.Key)
    return {
      name: fileName,
      path: file.Key,
      size: file.Size,
      uploadedOn: new Date(Number(fileName.split('-')[1]))
    }
  }).sort((a, b) => b.uploadedOn - a.uploadedOn)[0]
  print(`Downloading ${file.name}...`)

  const object = await getObject(file.path)
  const tarFile = await streamToTarGzFile(
    object.Body,
    getConfig().projectRoot,
    file.name
  )
  print(`File downloaded to ${tarFile}`)

  print('Extracting files...')
  await extractTarball(tarFile, getConfig().projectRoot)

  print('Files extracted successfully')

  fs.unlinkSync(tarFile)

  print('Temporary files removed')

  print('Done')
}

const args = process.argv.slice(2)
const [command, ...rest] = args
const options = processArguments(rest)

switch (command) {
  case 'init':
    init(options)
    break
  case 'push':
    push()
    break
  case 'pull':
    pull()
    break
  default:
    print('Command not found')
    break
}
