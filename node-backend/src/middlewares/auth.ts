import { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';

export const authenticateJWT = async (c: Context, next: Next) => {
  const authHeader = c.req.header('authorization');

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>

    try {
      // In Cloudflare Workers, process.env is usually not available unless polyfilled,
      // bindings are usually on c.env. 
      const secret = (c.env?.JWT_SECRET as string) || (process.env.JWT_SECRET as string);
      
      const user = jwt.verify(token, secret);
      c.set('user', user);
      await next();
    } catch (err) {
      return c.json({ success: false, message: 'Forbidden: Invalid token' }, 403);
    }
  } else {
    return c.json({ success: false, message: 'Unauthorized: No token provided' }, 401);
  }
};

export const optionalAuth = async (c: Context, next: Next) => {
  const authHeader = c.req.header('authorization');
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      const secret = (c.env?.JWT_SECRET as string) || (process.env.JWT_SECRET as string);
      const user = jwt.verify(token, secret);
      c.set('user', user);
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
