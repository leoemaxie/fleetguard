import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../hooks/authenticate.js';
import { tenantScope } from '../../hooks/tenant-scope.js';
import {
  loginController,
  logoutController,
  meController,
  refreshController,
  registerController
} from './auth.controller.js';
import { AuthTokensSchema, LoginSchema, LogoutSchema, RefreshSchema, RegisterSchema, UserProfileSchema } from './auth.schema.js';

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', { schema: { body: RegisterSchema, response: { 201: AuthTokensSchema } } }, registerController);
  app.post('/login', { schema: { body: LoginSchema, response: { 200: AuthTokensSchema } } }, loginController);
  app.post('/refresh', { schema: { body: RefreshSchema, response: { 200: z.object({ accessToken: z.string() }) } } }, refreshController);
  app.post('/logout', { schema: { body: LogoutSchema } }, logoutController);

  app.get('/me', { preHandler: [authenticate, tenantScope], schema: { response: { 200: UserProfileSchema } } }, meController);
};

export default authRoutes;
