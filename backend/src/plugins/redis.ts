import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { redis } from '../redis/client.js';

const redisPlugin: FastifyPluginAsync = async (app) => {
  await redis.connect();
  app.decorate('redis', redis);

  app.addHook('onClose', async () => {
    await redis.quit();
  });
};

export default fp(redisPlugin, { name: 'redis-plugin' });
