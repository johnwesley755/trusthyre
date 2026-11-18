import { Context } from 'hono';
import { ConversationService } from '../services/conversationService';
import { ApiResponse } from '../utils/ApiResponse';

export const getOrCreateConversation = async (c: Context) => {
  try {
    const applicationId = c.req.param('applicationId');
    if (!applicationId) {
      return c.json(ApiResponse.error('Application ID is required'), 400 as any);
    }

    const user = c.get('user');
    const userId = user?.sub || user?.id;

    if (!userId) {
      return c.json(ApiResponse.error('Unauthorized'), 401 as any);
    }

    const conversation = await ConversationService.getOrCreateConversationByApplication(
      applicationId,
      userId,
      user?.role
    );

    return c.json(ApiResponse.ok(conversation));
  } catch (err: any) {
    const status = err.message.includes('Forbidden') ? 403 : err.message.includes('not found') ? 404 : 400;
    return c.json(ApiResponse.error(err.message), status as any);
  }
};

export const getOrCreateByWorkOrder = async (c: Context) => {
  try {
    const workOrderId = c.req.param('workOrderId');
    if (!workOrderId) {
      return c.json(ApiResponse.error('Work order ID is required'), 400 as any);
    }

    const user = c.get('user');
    const userId = user?.sub || user?.id;

    if (!userId) {
      return c.json(ApiResponse.error('Unauthorized'), 401 as any);
    }

    const conversation = await ConversationService.getOrCreateConversationByWorkOrder(
      workOrderId,
      userId,
      user?.role
    );

    return c.json(ApiResponse.ok(conversation));
  } catch (err: any) {
    const status = err.message.includes('Forbidden') ? 403 : err.message.includes('not found') ? 404 : 400;
    return c.json(ApiResponse.error(err.message), status as any);
  }
};

export const getContacts = async (c: Context) => {
  try {
    const user = c.get('user');
    const userId = user?.sub || user?.id;

    if (!userId) {
      return c.json(ApiResponse.error('Unauthorized'), 401 as any);
    }

    const contacts = await ConversationService.getEmployerContacts(userId);
    return c.json(ApiResponse.ok(contacts));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getInbox = async (c: Context) => {
  try {
    const user = c.get('user');
    const userId = user?.sub || user?.id;

    if (!userId) {
      return c.json(ApiResponse.error('Unauthorized'), 401 as any);
    }

    const cursor = c.req.query('cursor');
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 20;

    const result = await ConversationService.getUserInbox(userId, { cursor, limit });
    return c.json(ApiResponse.ok(result));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getMessages = async (c: Context) => {
  try {
    const conversationId = c.req.param('id');
    if (!conversationId) {
      return c.json(ApiResponse.error('Conversation ID is required'), 400 as any);
    }

    const user = c.get('user');
    const userId = user?.sub || user?.id;

    if (!userId) {
      return c.json(ApiResponse.error('Unauthorized'), 401 as any);
    }

    const cursor = c.req.query('cursor');
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 30;

    const result = await ConversationService.getConversationMessages(conversationId, userId, { cursor, limit });
    return c.json(ApiResponse.ok(result));
  } catch (err: any) {
    const status = err.message.includes('Forbidden') ? 403 : err.message.includes('not found') ? 404 : 400;
    return c.json(ApiResponse.error(err.message), status as any);
  }
};

export const sendMessage = async (c: Context) => {
  try {
    const conversationId = c.req.param('id');
    if (!conversationId) {
      return c.json(ApiResponse.error('Conversation ID is required'), 400 as any);
    }

    const user = c.get('user');
    const userId = user?.sub || user?.id;

    if (!userId) {
      return c.json(ApiResponse.error('Unauthorized'), 401 as any);
    }

    const body = await c.req.json().catch(() => ({}));
    if (!body.body || typeof body.body !== 'string' || !body.body.trim()) {
      return c.json(ApiResponse.error('Message body is required'), 400 as any);
    }

    const message = await ConversationService.sendMessage(conversationId, userId, {
      body: body.body,
      clientMessageId: body.clientMessageId,
      metadata: body.metadata,
      workOrderId: body.workOrderId,
      interviewId: body.interviewId
    });

    return c.json(ApiResponse.ok(message), 201 as any);
  } catch (err: any) {
    const status = err.message.includes('Forbidden') ? 403 : err.message.includes('not found') ? 404 : 400;
    return c.json(ApiResponse.error(err.message), status as any);
  }
};

export const markAsRead = async (c: Context) => {
  try {
    const conversationId = c.req.param('id');
    if (!conversationId) {
      return c.json(ApiResponse.error('Conversation ID is required'), 400 as any);
    }

    const user = c.get('user');
    const userId = user?.sub || user?.id;

    if (!userId) {
      return c.json(ApiResponse.error('Unauthorized'), 401 as any);
    }

    const body = await c.req.json().catch(() => ({}));
    const result = await ConversationService.markConversationAsRead(
      conversationId,
      userId,
      body.lastReadMessageId
    );

    return c.json(ApiResponse.ok(result));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getUnreadCount = async (c: Context) => {
  try {
    const user = c.get('user');
    const userId = user?.sub || user?.id;

    if (!userId) {
      return c.json(ApiResponse.error('Unauthorized'), 401 as any);
    }

    const unreadCount = await ConversationService.getTotalUnreadCount(userId);
    return c.json(ApiResponse.ok({ unreadCount }));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const reportConversation = async (c: Context) => {
  try {
    const conversationId = c.req.param('id');
    if (!conversationId) {
      return c.json(ApiResponse.error('Conversation ID is required'), 400 as any);
    }

    const user = c.get('user');
    const userId = user?.sub || user?.id;

    if (!userId) {
      return c.json(ApiResponse.error('Unauthorized'), 401 as any);
    }

    const body = await c.req.json().catch(() => ({}));
    if (!body.reason) {
      return c.json(ApiResponse.error('Report reason is required'), 400 as any);
    }

    const report = await ConversationService.reportConversation(conversationId, userId, {
      reason: body.reason,
      notes: body.notes
    });

    return c.json(ApiResponse.ok(report), 201 as any);
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 400 as any);
  }
};
