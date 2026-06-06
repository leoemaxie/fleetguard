import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { SQSClient } from '@aws-sdk/client-sqs'
import { env } from '../config/env.js'

const sqsPlugin: FastifyPluginAsync = async app => {
  const sqs = new SQSClient({ region: env.AWS_REGION })
  app.decorate('sqs', sqs)
}

export default fp(sqsPlugin, { name: 'sqs-plugin' })
