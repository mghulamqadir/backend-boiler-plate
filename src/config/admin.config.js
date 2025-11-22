import { buildAuthenticatedRouter } from '@adminjs/express';
import AdminJS, { DefaultAuthProvider } from 'adminjs';
import * as AdminJSMongoose from '@adminjs/mongoose';
import { adminLogin } from '../services/auth.services.js';
import User from '../models/user.model.js'

AdminJS.registerAdapter({
  Resource: AdminJSMongoose.Resource,
  Database: AdminJSMongoose.Database,
});

export const adminJs = new AdminJS({
  resources: [
    User,
  ],
  rootPath: '/admin',
  branding: {
    companyName: 'Backend',
    logo: false,
    softwareBrothers: false,
    favicon: false,
    withMadeWithLove: false,
    withGoogleAnalytics: false,
  },
});

const authenticate = async ({ email, password }) => {
  try {
    return await adminLogin({ email, password });
  } catch (error) {
    console.error('Authentication error:', error);
    return false;
  }
};

const authProvider = new DefaultAuthProvider({
  authenticate,
});

export const adminJsRouter = buildAuthenticatedRouter(
  adminJs,
  {
    cookiePassword: 'test',
    provider: authProvider,
  },
  null,
  {
    secret: 'test',
    resave: false,
    saveUninitialized: true,
  },
);

if (process.env.ENV === 'development') {
  adminJs.watch();
}
