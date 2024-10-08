import { getConfig } from './utils.js'

import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand
} from '@aws-sdk/client-s3'
import path from 'path'

function getS3Client() {
  const awsConfig = getConfig().aws
  return new S3Client({
    region: awsConfig.region,
    credentials: {
      accessKeyId: awsConfig.accessKeyId,
      secretAccessKey: awsConfig.secretAccessKey
    }
  })
}

export function uploadFile(filePath, fileContent) {
  const awsConfig = getConfig().aws
  const client = getS3Client()

  const prefix = awsConfig.prefix
  const key =
    prefix != null && prefix.trim() != ''
      ? path.join(prefix, path.basename(filePath))
      : path.basename(filePath)

  const command = new PutObjectCommand({
    Bucket: awsConfig.bucket,
    Key: key,
    Body: fileContent
  })

  return client.send(command)
}

export function getUserSecrets() {
  const awsConfig = getConfig().aws
  const client = getS3Client()

  const prefix = path.join(awsConfig.prefix, getConfig().name)
  const command = new ListObjectsV2Command({
    Bucket: awsConfig.bucket,
    Prefix: prefix
  })

  return client.send(command)
}

export function getObject(key) {
  const awsConfig = getConfig().aws
  const client = getS3Client()

  const command = new GetObjectCommand({
    Bucket: awsConfig.bucket,
    Key: key
  })

  return client.send(command)
}
