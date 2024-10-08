import fs from 'fs'
import zlib from 'zlib'
import * as tar from 'tar'
import path from 'path'

export function getConfig() {
  const configPath = path.join(process.cwd(), '.svrc')
  if (!fs.existsSync(configPath)) {
    return null
  }

  return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
}

export function checkAWSConfig() {
  const config = getConfig()

  if (!config) {
    return 'Configuration file not found'
  }

  if (!config.aws) {
    return 'AWS configuration not found'
  }

  const { bucket, region, accessKeyId, secretAccessKey } = config.aws
  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    return 'AWS configuration is incomplete'
  }

  return null
}

export function processArguments(args) {
  const options = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--') || arg.startsWith('-')) {
      const [key, value] = arg.replace(/^--?/, '').split('=')
      if (value) {
        options[key] = value
      } else {
        options[key] = true
      }
    } else {
      options[arg] = true
    }
  }

  return options
}

export function compressFilesIntoGzip(files) {
  return files.map((file) => {
    const content = fs.readFileSync(file)
    const compressed = zlib.gzipSync(content)

    return {
      name: file,
      content: compressed
    }
  })
}

export function createTarball(projectRoot, filePaths) {
  const folderName = path.basename(projectRoot)
  const parent = path.dirname(projectRoot)
  const destPath = path.join(
    parent,
    `${folderName}-${new Date().getTime()}-secrets.tar.gz`
  )
  return new Promise((resolve, reject) => {
    tar
      .create(
        {
          gzip: true,
          file: destPath,
          cwd: parent
        },
        filePaths.map((file) => path.join(folderName, file))
      )
      .then(() => {
        const content = fs.readFileSync(destPath)
        resolve({
          name: destPath,
          content
        })
      })
      .catch(reject)
  })
}

export async function streamToTarGzFile(stream, projectRoot, fileName) {
  const parent = path.dirname(projectRoot)
  const destPath = path.join(parent, fileName)
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(destPath)
    stream.pipe(writeStream)

    writeStream.on('finish', () => {
      resolve(destPath)
    })

    writeStream.on('error', (err) => {
      reject(err)
    })

    stream.on('error', (err) => {
      reject(err)
    })

    stream.resume()

    return writeStream
  })
}

export async function extractTarball(tarball, destPath) {
  return tar.extract({
    file: tarball,
    cwd: path.dirname(destPath)
  })
}
