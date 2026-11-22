import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';

export interface ConversationOtherParty {
  userId: string;
  name: string;
  photoUrl: string | null;
  role: string;
}

export interface LinkedHiringContext {
  application?: {
    id: string;
    status: string;
    appliedAt: string;
  } | null;
  workOrder?: {
    id: string;
    orderNumber: string;
    status: string;
    wageAmount: number;
    wageFrequency: string;
    startDate: string;
    worksiteName: string;
    worksiteAddress: string;
  } | null;
  interview?: {
    id: string;
    type: string;
    scheduledAt: string;
    status: string;
    locationAddress?: string | null;
    instructions?: string | null;
  } | null;
}

export interface ConversationItem {
  id: string;
  applicationId?: string | null;
  workOrderId?: string | null;
  hiringStage?: 'HIRED' | 'WORK_ORDER_SENT' | 'SHORTLISTED' | 'INTERVIEWING' | 'APPLIED';
  jobId: string;
  jobTitle: string;
  status: string;
  lastMessageAt: string;
  unreadCount: number;
  isMuted: boolean;
  otherParty: ConversationOtherParty;
  lastMessage?: {
    id: string;
    body: string;
    messageType: string;
    createdAt: string;
    senderId: string;
  } | null;
  lastMessagePreview?: {
    id: string;
    body: string;
    messageType: string;
    createdAt: string;
    senderUserId: string;
  } | null;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  message_type: 'TEXT' | 'SYSTEM' | 'ATTACHMENT';
  body: string;
  client_message_id?: string | null;
  work_order_id?: string | null;
  interview_id?: string | null;
  metadata?: {
    attachmentUrl?: string;
    fileType?: string;
    fileName?: string;
    fileSize?: number;
    publicId?: string;
    [key: string]: any;
  } | null;
  created_at: string;
  edited_at?: string | null;
}

export interface CandidateContactHired {
  type: 'HIRED_WORKER';
  workerId: string;
  workerName: string;
  photoUrl: string | null;
  city: string;
  jobTitle: string;
  jobId: string | null;
  workOrderId: string;
  orderNumber: string;
  workOrderStatus: string;
  wageAmount: number;
  wageFrequency: string;
  startDate: string;
  conversationId: string | null;
}

export interface CandidateContactApplicant {
  type: 'APPLICANT';
  workerId: string;
  workerName: string;
  photoUrl: string | null;
  city: string;
  skills: string;
  jobTitle: string;
  jobId: string;
  applicationId: string;
  applicationStatus: string;
  appliedAt: string;
  conversationId: string | null;
}

export interface EmployerContactsResponse {
  hired: CandidateContactHired[];
  shortlisted: CandidateContactApplicant[];
  applicants: CandidateContactApplicant[];
  totalCount: number;
}

export interface ConversationThreadResponse {
  conversation: {
    id: string;
    applicationId?: string | null;
    workOrderId?: string | null;
    jobId: string;
    jobTitle: string;
    status: string;
    counterpart: {
      userId: string;
      name: string;
      photoUrl?: string | null;
      role: 'WORKER' | 'EMPLOYER';
    };
    linkedHiringContext?: LinkedHiringContext;
  };
  messages: ConversationMessage[];
  hasMore: boolean;
  nextCursor: string | null;
}

export const conversationService = {
  getInbox: async (): Promise<{ conversations: ConversationItem[]; total: number }> => {
    const res = await apiClient.get<{ success: boolean; data: { conversations: ConversationItem[]; total: number } }>('/api/conversations');
    return res.data?.data || res.data;
  },

  getEmployerContacts: async (): Promise<EmployerContactsResponse> => {
    const res = await apiClient.get<{ success: boolean; data: EmployerContactsResponse }>('/api/conversations/contacts');
    return res.data?.data || res.data;
  },

  getUnreadCount: async (): Promise<number> => {
    try {
      const res = await apiClient.get<{ success: boolean; data: { unreadCount: number } }>('/api/conversations/unread-count');
      return res.data?.data?.unreadCount ?? 0;
    } catch {
      return 0;
    }
  },

  getOrCreateByApplication: async (applicationId: string): Promise<any> => {
    const res = await apiClient.post<{ success: boolean; data: any }>(`/api/conversations/by-application/${applicationId}`);
    return res.data?.data || res.data;
  },

  getOrCreateByWorkOrder: async (workOrderId: string): Promise<any> => {
    const res = await apiClient.post<{ success: boolean; data: any }>(`/api/conversations/by-work-order/${workOrderId}`);
    return res.data?.data || res.data;
  },

  getMessages: async (conversationId: string, cursor?: string): Promise<ConversationThreadResponse> => {
    const res = await apiClient.get<{ success: boolean; data: ConversationThreadResponse }>(
      `/api/conversations/${conversationId}/messages`,
      { params: cursor ? { cursor } : undefined }
    );
    return res.data?.data || res.data;
  },

  sendMessage: async (
    conversationId: string,
    body: string,
    clientMessageId?: string,
    workOrderId?: string,
    interviewId?: string,
    metadata?: Record<string, any>,
    messageType?: 'TEXT' | 'ATTACHMENT' | 'SYSTEM'
  ): Promise<ConversationMessage> => {
    const res = await apiClient.post<{ success: boolean; data: ConversationMessage }>(
      `/api/conversations/${conversationId}/messages`,
      { body, clientMessageId, workOrderId, interviewId, metadata, messageType }
    );
    return res.data?.data || res.data;
  },

  uploadAttachment: async (file: File): Promise<{
    url: string;
    publicId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<{ success: boolean; data: any }>('/api/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    const media = res.data?.data || res.data;
    return {
      url: media.url,
      publicId: media.publicId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    };
  },

  markAsRead: async (conversationId: string, lastReadMessageId?: string): Promise<any> => {
    const res = await apiClient.patch(`/api/conversations/${conversationId}/read`, {
      lastReadMessageId
    });
    return res.data;
  },

  muteConversation: async (conversationId: string, mute: boolean): Promise<any> => {
    const res = await apiClient.patch(`/api/conversations/${conversationId}/mute`, { mute });
    return res.data;
  },

  reportConversation: async (
    conversationId: string,
    reason: string,
    details?: string
  ): Promise<any> => {
    const res = await apiClient.post(`/api/conversations/${conversationId}/report`, {
      reason,
      details
    });
    return res.data;
  }
};

// React Query Hooks (matching pattern in useAppNotifications: direct cache updates, zero repeated polling loops)
export const useConversationInbox = () => {
  return useQuery({
    queryKey: ['conversations', 'inbox'],
    queryFn: conversationService.getInbox,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export const useConversationUnreadCount = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['conversations', 'unreadCount'],
    queryFn: conversationService.getUnreadCount,
    enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export const useConversationMessages = (conversationId?: string) => {
  return useQuery({
    queryKey: ['conversations', conversationId, 'messages'],
    queryFn: () => conversationService.getMessages(conversationId!),
    enabled: Boolean(conversationId),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      body,
      clientMessageId,
      workOrderId,
      interviewId,
      metadata,
      messageType
    }: {
      conversationId: string;
      body: string;
      clientMessageId?: string;
      workOrderId?: string;
      interviewId?: string;
      metadata?: Record<string, any>;
      messageType?: 'TEXT' | 'ATTACHMENT' | 'SYSTEM';
    }) => conversationService.sendMessage(conversationId, body, clientMessageId, workOrderId, interviewId, metadata, messageType),
    onSuccess: (newMsg, variables) => {
      // 1. Direct cache patching - instantly appends to local messages array for sender
      queryClient.setQueryData<ConversationThreadResponse>(
        ['conversations', variables.conversationId, 'messages'],
        (old) => {
          if (!old) {
            return old;
          }
          const currentMessages = old.messages || [];
          const exists = currentMessages.some((m) => m.id === newMsg.id || (newMsg.client_message_id && m.client_message_id === newMsg.client_message_id));
          if (exists) {
            return {
              ...old,
              messages: currentMessages.map((m) =>
                m.id === newMsg.id || (newMsg.client_message_id && m.client_message_id === newMsg.client_message_id) ? newMsg : m
              )
            };
          }
          return {
            ...old,
            messages: [...currentMessages, newMsg]
          };
        }
      );

      // 2. Invalidate query to ensure full consistency and trigger any attached listeners
      queryClient.invalidateQueries({
        queryKey: ['conversations', variables.conversationId, 'messages']
      });

      // 3. Direct update of inbox snippet
      queryClient.setQueryData<{ conversations: ConversationItem[]; total: number }>(
        ['conversations', 'inbox'],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            conversations: old.conversations.map((c) =>
              c.id === variables.conversationId
                ? {
                    ...c,
                    lastMessage: {
                      id: newMsg.id,
                      body: newMsg.body,
                      messageType: newMsg.message_type,
                      metadata: newMsg.metadata,
                      createdAt: newMsg.created_at,
                      senderId: newMsg.sender_user_id
                    },
                    lastMessageAt: newMsg.created_at,
                    lastMessagePreview: {
                      id: newMsg.id,
                      body: newMsg.body,
                      messageType: newMsg.message_type,
                      createdAt: newMsg.created_at,
                      senderUserId: newMsg.sender_user_id
                    }
                  }
                : c
            )
          };
        }
      );

      queryClient.invalidateQueries({
        queryKey: ['conversations', 'inbox']
      });
    }
  });
};

export const useMarkConversationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, lastReadMessageId }: { conversationId: string; lastReadMessageId?: string }) =>
      conversationService.markAsRead(conversationId, lastReadMessageId),
    onSuccess: (_, variables) => {
      // Direct update of inbox unread count - zero background GET queries
      queryClient.setQueryData<{ conversations: ConversationItem[]; total: number }>(
        ['conversations', 'inbox'],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            conversations: old.conversations.map((c) =>
              c.id === variables.conversationId ? { ...c, unreadCount: 0 } : c
            )
          };
        }
      );

      queryClient.setQueryData<number>(['conversations', 'unreadCount'], (prev = 0) => Math.max(0, prev - 1));
    }
  });
};

export const useEmployerConversationContacts = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['conversations', 'contacts'],
    queryFn: conversationService.getEmployerContacts,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
