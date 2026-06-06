import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { db } from '../db/client.js'

const dbPlugin: FastifyPluginAsync = async app => {
  app.decorate('db', db)
}

export default fp(dbPlugin, { name: 'db-plugin' })
