import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { sql } from 'drizzle-orm'

const rlsPlugin: FastifyPluginAsync = async app => {
  app.addHook('preHandler', async request => {
    if (!request.user?.tenantId) {
      return
    }
    request.txDb = app.db
    await app.db.execute(sql`SET app.current_tenant = ${request.user.tenantId}`)
    await app.db.execute(
      sql`SET LOCAL app.current_tenant = ${request.user.tenantId}`,
    )
  })
}

export default fp(rlsPlugin, { name: 'rls-plugin' })
