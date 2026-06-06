import type { SQSClient } from '@aws-sdk/client-sqs';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type Redis from 'ioredis';
import type { DrizzleClient } from '../db/client.js';
import type { Role } from './common.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      tenantId: string;
      role: Role;
      email?: string;
    };
    user: {
      sub: string;
      tenantId: string;
      role: Role;
      email?: string;
    };
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string;
    user: {
      id: string;
      email: string;
      role: Role;
      tenantId: string;
    };
    txDb?: DrizzleClient;
  }

  interface FastifyInstance {
    db: DrizzleClient;
    redis: Redis;
    sqs: SQSClient;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (allowed: Role[]) => preHandlerHookHandler;
  }
}
