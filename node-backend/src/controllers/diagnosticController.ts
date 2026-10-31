import { Context } from 'hono';
import { ApiResponse } from '../utils/ApiResponse';
import prisma from '../config/prisma';

export const getBrevoDiagnostics = async (c: Context) => {
  try {
    const authUser = c.get('user');
    const isAdmin = authUser?.role === 'ADMIN' || authUser?.role === 'SUPER_ADMIN';
    if (!isAdmin) {
      return c.json(ApiResponse.error('Unauthorized: Admin access required'), 403 as any);
    }

    const apiKey = (process.env.BREVO_API_KEY || '').trim();
    const senderEmail = (process.env.BREVO_SENDER_EMAIL || 'noreply@trusthyre.com').trim();

    if (!apiKey) {
      return c.json(ApiResponse.error('BREVO_API_KEY is not configured in Cloudflare secrets'), 500 as any);
    }

    // 1. Check Brevo Senders
    const sendersRes = await fetch('https://api.brevo.com/v3/senders', {
      headers: { 'accept': 'application/json', 'api-key': apiKey }
    });
    const sendersData: any = await sendersRes.json().catch(() => ({}));

    // 2. Check Recent Email Events (for bounces, drops, spam, deliveries)
    const eventsRes = await fetch('https://api.brevo.com/v3/smtp/statistics/events?limit=20', {
      headers: { 'accept': 'application/json', 'api-key': apiKey }
    });
    const eventsData: any = await eventsRes.json().catch(() => ({}));

    return c.json(ApiResponse.ok('Brevo diagnostics retrieved', {
      senderConfigured: senderEmail,
      sendersResponse: sendersData,
      recentEvents: eventsData?.events || eventsData
    }));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};
