import { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { requestContextStorage } from '../config/prisma';

export const authenticateJWT = async (c: Context, next: Next) => {
  const authHeader = c.req.header('authorization');

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>

    try {
      // In Cloudflare Workers, process.env is usually not available unless polyfilled,
      // bindings are usually on c.env. 
      const secret = (c.env?.JWT_SECRET as string) || (process.env.JWT_SECRET as string);
      
      const user: any = jwt.verify(token, secret, { algorithms: ['HS256'] });
      c.set('user', user);

      // Bind authenticated claims to Request Context for RLS
      const store = requestContextStorage.getStore();
      if (store && user) {
        store.currentUserId = user.sub;
        store.currentUserRole = user.role;
      }

      await next();
    } catch (err) {
      return c.json({ success: false, message: 'Forbidden: Invalid token' }, 403);
    }
  } else {
    return c.json({ success: false, message: 'Unauthorized: No token provided' }, 401);
  }
};

// Alias requireAuth to authenticateJWT for semantic consistency across routes
export const requireAuth = authenticateJWT;

export const optionalAuth = async (c: Context, next: Next) => {
  const authHeader = c.req.header('authorization');
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      const secret = (c.env?.JWT_SECRET as string) || (process.env.JWT_SECRET as string);
      const user: any = jwt.verify(token, secret, { algorithms: ['HS256'] });
      c.set('user', user);

      // Bind optional claims to Request Context for RLS
      const store = requestContextStorage.getStore();
      if (store && user) {
        store.currentUserId = user.sub;
        store.currentUserRole = user.role;
      }
    } catch (err) {
      // ignore invalid tokens for optional auth
    }
  }
  await next();
};

export const requireAdmin = async (c: Context, next: Next) => {
  const user = c.get('user');
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return c.json({ success: false, message: 'Forbidden: Admin access required' }, 403 as any);
  }
  await next();
};

export const requireWorker = async (c: Context, next: Next) => {
  const user = c.get('user');
  if (!user || (user.role !== 'WORKER' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return c.json({ success: false, message: 'Forbidden: Candidate/Worker access required' }, 403 as any);
  }
  await next();
};

export const requireEmployer = async (c: Context, next: Next) => {
  const user = c.get('user');
  if (!user || (user.role !== 'EMPLOYER' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return c.json({ success: false, message: 'Forbidden: Employer access required' }, 403 as any);
  }
  await next();
};

/**
 * Route-level check permitting Employers, Admins, or Supervisors.
 * Fine-grained per-shift supervisor assignment is validated in the controller/service layer.
 */
export const requireShiftSupervisorOrEmployer = async (c: Context, next: Next) => {
  const user = c.get('user');
  if (!user || (!['EMPLOYER', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role?.toUpperCase()))) {
    return c.json({ success: false, message: 'Forbidden: Employer or Supervisor access required' }, 403 as any);
  }
  await next();
};

export const requireSuperAdmin = async (c: Context, next: Next) => {
  const user = c.get('user');
  if (!user || user.role !== 'SUPER_ADMIN') {
    return c.json({ success: false, message: 'Forbidden: Super Administrator access required' }, 403 as any);
  }
  await next();
};
