import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Send,
  Briefcase,
  ShieldAlert,
  Volume2,
  VolumeX,
  MoreVertical,
  Check,
  CheckCheck,
  AlertCircle,
  Loader2,
  User,
  Building,
  FileText,
  Calendar,
  Paperclip,
  Image as ImageIcon,
  FileDown,
  X,
  Eye,
  Download,
  ArrowLeft
} from 'lucide-react';
import {
  useConversationMessages,
  useSendMessage,
  conversationService,
  type ConversationMessage
} from '../../../services/conversation.service';
import { useUser } from '../../../providers/AuthContext';
import { fcmService } from '../../../services/fcm.service';

interface ConversationThreadPageProps {
  conversationId?: string;
  isSplitView?: boolean;
  onBack?: () => void;
}

export const ConversationThreadPage: React.FC<ConversationThreadPageProps> = ({
  conversationId: propConversationId,
  isSplitView = false,
  onBack
}) => {
  const { conversationId: paramConversationId } = useParams<{ conversationId: string }>();
  const activeConversationId = propConversationId || paramConversationId;
  const navigate = useNavigate();
  const { user } = useUser();

  const [inputBody, setInputBody] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('OFF_PLATFORM_COMMUNICATION');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Attachment & Lightbox state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastMarkedReadIdRef = useRef<string | null>(null);

  const { data, isLoading, isError, refetch } = useConversationMessages(activeConversationId);
  const sendMessageMutation = useSendMessage();

  const threadMessages = data?.messages || [];

  // Scroll to bottom smoothly on initial load and message updates
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (threadMessages.length > 0) {
      scrollToBottom('auto');
      // Mark as read only once per newly arrived inbound message
      const latestMsg = threadMessages[threadMessages.length - 1];
      if (
        activeConversationId &&
        latestMsg &&
        latestMsg.id !== lastMarkedReadIdRef.current &&
        latestMsg.sender_user_id !== user?.id
      ) {
        lastMarkedReadIdRef.current = latestMsg.id;
        conversationService.markAsRead(activeConversationId, latestMsg.id).catch(() => {});
      }
    }
  }, [threadMessages.length, activeConversationId, user?.id]);

  // Listen for real-time FCM push notifications in foreground to immediately refresh this thread
  useEffect(() => {
    let unsubscribeFn: (() => void) | null = null;
    fcmService.listenToForegroundMessages((payload: any) => {
      const convId = payload?.data?.conversationId;
      if (convId === activeConversationId || payload?.data?.type === 'CHAT_MESSAGE') {
        refetch();
      }
    }).then((unsub: any) => {
      unsubscribeFn = unsub;
    }).catch(() => {});

    return () => {
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  }, [activeConversationId, refetch]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds 10MB limit.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate MIME types
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Only images (JPEG, PNG, WEBP) and PDF documents are allowed.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const preview = URL.createObjectURL(file);
      setFilePreviewUrl(preview);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleClearSelectedFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputBody.trim();
    if ((!trimmed && !selectedFile) || !activeConversationId || sendMessageMutation.isPending || isUploadingAttachment) return;

    if (trimmed.length > 2000) {
      setErrorMessage('Message exceeds 2,000 characters limit.');
      return;
    }

    setErrorMessage(null);

    let attachmentMetadata: any = null;
    let messageType: 'TEXT' | 'ATTACHMENT' = 'TEXT';

    if (selectedFile) {
      setIsUploadingAttachment(true);
      try {
        const uploadResult = await conversationService.uploadAttachment(selectedFile);
        attachmentMetadata = {
          attachmentUrl: uploadResult.url,
          publicId: uploadResult.publicId,
          fileName: uploadResult.fileName,
          fileType: uploadResult.fileType,
          fileSize: uploadResult.fileSize
        };
        messageType = 'ATTACHMENT';
      } catch (uploadErr: any) {
        setIsUploadingAttachment(false);
        setErrorMessage(uploadErr?.response?.data?.message || uploadErr?.message || 'Failed to upload attachment. Please check file and retry.');
        return;
      }
      setIsUploadingAttachment(false);
    }

    // Clear composer inputs
    setInputBody('');
    handleClearSelectedFile();

    // Generate unique client idempotency ID
    const clientMessageId = `web-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      await sendMessageMutation.mutateAsync({
        conversationId: activeConversationId,
        body: trimmed,
        messageType,
        metadata: attachmentMetadata,
        clientMessageId
      });
      scrollToBottom('smooth');
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to send message. Please try again.');
      setInputBody(trimmed); // Restore typed message on error
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleToggleMute = async () => {
    if (!activeConversationId) return;
    try {
      const nextState = !isMuted;
      await conversationService.muteConversation(activeConversationId, nextState);
      setIsMuted(nextState);
      setIsMenuOpen(false);
    } catch (_err) {
      // Mute toggle failure handled silently
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversationId) return;
    setReportSubmitting(true);
    try {
      await conversationService.reportConversation(activeConversationId, reportReason, reportDetails);
      setReportSuccess(true);
      setTimeout(() => {
        setIsReportModalOpen(false);
        setReportSuccess(false);
        setReportDetails('');
      }, 1800);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to file report');
    } finally {
      setReportSubmitting(false);
    }
  };

  if (!activeConversationId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
        <Briefcase className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No conversation selected</h3>
        <p className="mt-1 max-w-sm text-sm">
          Select an application conversation from your inbox or message an applicant from the candidates list.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-3 bg-slate-50 p-8 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Loading conversation thread...</p>
      </div>
    );
  }

  if (isError || !data?.conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-red-500" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Conversation Unavailable</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-600 dark:text-slate-400">
          You might not have permission to view this conversation or the linked job application was closed.
        </p>
        <button
          onClick={() => (onBack ? onBack() : navigate('/messages'))}
          className="mt-4 inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Return to Inbox
        </button>
      </div>
    );
  }

  const { conversation, messages = [] } = data;
  const counterpart = conversation.counterpart;

  return (
    <div className="relative flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      {/* Thread Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to conversations"
              className="mr-1 -ml-1 flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors lg:hidden cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <div className="relative">
            {counterpart.photoUrl ? (
              <img
                src={counterpart.photoUrl}
                alt={counterpart.name}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-emerald-500/20"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 font-semibold">
                {counterpart.role === 'EMPLOYER' ? (
                  <Building className="h-5 w-5" />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 flex-wrap">
              <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">
                {counterpart.name}
              </h2>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {counterpart.role === 'EMPLOYER' ? 'Employer' : 'Candidate'}
              </span>
              {conversation.linkedHiringContext?.workOrder ? (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  conversation.linkedHiringContext.workOrder.status === 'ACCEPTED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-blue-100 text-blue-800 dark:bg-sky-950/60 dark:text-sky-300 border border-blue-200 dark:border-sky-800'
                }`}>
                  <FileText className="w-2.5 h-2.5" />
                  <span>{conversation.linkedHiringContext.workOrder.status === 'ACCEPTED' ? 'Hired' : `WO: ${conversation.linkedHiringContext.workOrder.status}`}</span>
                </span>
              ) : conversation.linkedHiringContext?.interview ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <Calendar className="w-2.5 h-2.5" />
                  <span>Interview</span>
                </span>
              ) : null}
            </div>
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
              <Briefcase className="mr-1 h-3 w-3 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <Link
                to={`/jobs/${conversation.jobId}`}
                className="truncate hover:text-emerald-600 hover:underline dark:hover:text-emerald-400"
              >
                {conversation.jobTitle}
              </Link>
            </div>
          </div>
        </div>

        {/* Action Menu */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Conversation actions"
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-800 z-30">
              <button
                onClick={handleToggleMute}
                className="flex w-full items-center px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60"
              >
                {isMuted ? (
                  <>
                    <Volume2 className="mr-2.5 h-4 w-4 text-emerald-600" />
                    Unmute notifications
                  </>
                ) : (
                  <>
                    <VolumeX className="mr-2.5 h-4 w-4 text-slate-500" />
                    Mute notifications
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsReportModalOpen(true);
                }}
                className="flex w-full items-center px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <ShieldAlert className="mr-2.5 h-4 w-4" />
                Report conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 sm:px-6">
        {/* Safety Disclaimer Header */}
        <div className="mx-auto max-w-lg rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-center text-xs text-emerald-900 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
          🔒 <span className="font-semibold">TrustHyre Verified Channel:</span> Conversations are permanently linked to your job application. Never share sensitive banking OTPs or accept cash payments outside platform work orders.
        </div>

        {/* Pinned Work Order Card */}
        {conversation.linkedHiringContext?.workOrder && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-blue-200 dark:border-sky-900/60 bg-blue-50/90 dark:bg-sky-950/30 p-3.5 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-[#0f2f63]/10 dark:bg-sky-500/20 text-[#0f2f63] dark:text-sky-300 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                    Work Order #{conversation.linkedHiringContext.workOrder.orderNumber}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    conversation.linkedHiringContext.workOrder.status === 'ACCEPTED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : conversation.linkedHiringContext.workOrder.status === 'SENT'
                      ? 'bg-blue-100 text-blue-800 dark:bg-sky-900/60 dark:text-sky-300'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}>
                    {conversation.linkedHiringContext.workOrder.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 truncate">
                  ₹{conversation.linkedHiringContext.workOrder.wageAmount.toLocaleString('en-IN')}/{conversation.linkedHiringContext.workOrder.wageFrequency.toLowerCase()} • {conversation.linkedHiringContext.workOrder.worksiteName}
                </p>
              </div>
            </div>
            <Link
              to={`/work-orders/${conversation.linkedHiringContext.workOrder.id}`}
              className="shrink-0 px-3 py-1.5 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-bold transition-all shadow-xs active:scale-95 whitespace-nowrap"
            >
              View Terms
            </Link>
          </div>
        )}

        {messages.map((msg: ConversationMessage) => {
          if (msg.message_type === 'SYSTEM') {
            return (
              <div key={msg.id} className="my-3 flex justify-center">
                <div className="max-w-md rounded-full bg-slate-200/80 px-4 py-1.5 text-center text-xs font-medium text-slate-700 dark:bg-slate-800/90 dark:text-slate-300">
                  {msg.body}
                </div>
              </div>
            );
          }

          const isMine = msg.sender_user_id === user?.id;
          const timeFormatted = new Date(msg.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          });

          const attachmentMeta = msg.metadata?.attachmentUrl ? msg.metadata : null;
          const isImageAttachment = attachmentMeta?.fileType?.startsWith('image/') || 
            (attachmentMeta?.attachmentUrl && /\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i.test(attachmentMeta.attachmentUrl));
          const isPdfAttachment = attachmentMeta?.fileType === 'application/pdf' || 
            (attachmentMeta?.attachmentUrl && /\.pdf(\?.*)?$/i.test(attachmentMeta.attachmentUrl));

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm sm:max-w-[70%] break-words ${
                  isMine
                    ? 'bg-emerald-600 text-white rounded-br-none dark:bg-emerald-600'
                    : 'bg-white text-slate-900 rounded-bl-none border border-slate-200/80 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100'
                }`}
              >
                {/* Image Attachment Card */}
                {isImageAttachment && attachmentMeta?.attachmentUrl && (
                  <div className="mb-2 overflow-hidden rounded-xl bg-slate-900/10 dark:bg-black/20">
                    <img
                      src={attachmentMeta.attachmentUrl}
                      alt={attachmentMeta.fileName || 'Photo attachment'}
                      loading="lazy"
                      onClick={() => setLightboxImageUrl(attachmentMeta.attachmentUrl || null)}
                      className="max-h-72 w-full object-cover cursor-pointer transition hover:opacity-95"
                    />
                    <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] opacity-80">
                      <span className="truncate max-w-[180px]">{attachmentMeta.fileName || 'Photo'}</span>
                      <button
                        type="button"
                        onClick={() => setLightboxImageUrl(attachmentMeta.attachmentUrl || null)}
                        className="hover:underline flex items-center gap-1 font-medium ml-2"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </div>
                  </div>
                )}

                {/* PDF Document Card */}
                {isPdfAttachment && attachmentMeta?.attachmentUrl && (
                  <div className={`mb-2 flex items-center justify-between gap-3 rounded-xl p-3 border transition ${
                    isMine 
                      ? 'bg-emerald-700/60 border-emerald-500 text-white' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 dark:bg-slate-900/70 dark:border-slate-700 dark:text-slate-100'
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold leading-snug">
                          {attachmentMeta.fileName || 'Document.pdf'}
                        </p>
                        <p className="text-[10px] opacity-75">
                          {attachmentMeta.fileSize 
                            ? `${(attachmentMeta.fileSize / (1024 * 1024)).toFixed(2)} MB • PDF` 
                            : 'PDF Document'}
                        </p>
                      </div>
                    </div>
                    <a
                      href={attachmentMeta.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={attachmentMeta.fileName || 'document.pdf'}
                      className={`shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-xs transition ${
                        isMine 
                          ? 'bg-white text-emerald-800 hover:bg-emerald-50' 
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </div>
                )}

                {/* Message Body Caption */}
                {msg.body && (
                  <div className="whitespace-pre-wrap">{msg.body}</div>
                )}
              </div>
              <div className="mt-1 flex items-center space-x-1 px-1 text-[11px] text-slate-400 dark:text-slate-500">
                <span>{timeFormatted}</span>
                {isMine && <CheckCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <div className="sticky bottom-0 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        {errorMessage && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="font-bold ml-2">×</button>
          </div>
        )}

        {/* Selected File Preview Banner */}
        {selectedFile && (
          <div className="mb-2.5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/80">
            <div className="flex items-center gap-2.5 min-w-0">
              {filePreviewUrl ? (
                <img
                  src={filePreviewUrl}
                  alt="Preview"
                  className="h-10 w-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                  <FileText className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {selectedFile.name}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type.startsWith('image/') ? 'Photo' : 'PDF Document'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClearSelectedFile}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition"
              aria-label="Remove attachment"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileChange}
          className="hidden"
          id="chat-file-attachment-input"
        />

        <form onSubmit={handleSend} className="flex items-end space-x-2">
          {/* Paperclip / File Picker Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sendMessageMutation.isPending || isUploadingAttachment}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/80 transition disabled:opacity-50"
            title="Attach photo or PDF"
            aria-label="Attach photo or PDF"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <div className="relative flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              rows={2}
              maxLength={2000}
              value={inputBody}
              onChange={(e) => setInputBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedFile
                  ? `Add a caption (optional)...`
                  : window.innerWidth < 640
                  ? `Message ${counterpart.name}...`
                  : `Message ${counterpart.name} regarding "${conversation.jobTitle}"...`
              }
              className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 p-2.5 pb-6 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-400 dark:focus:bg-slate-800"
            />
            <div className="pointer-events-none absolute right-2.5 bottom-1 text-[10px] text-slate-400 dark:text-slate-500 bg-slate-50/80 dark:bg-slate-800/80 px-1 rounded">
              {inputBody.length}/2000
            </div>
          </div>

          <button
            type="submit"
            disabled={(!inputBody.trim() && !selectedFile) || sendMessageMutation.isPending || isUploadingAttachment}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-emerald-600 dark:hover:bg-emerald-500"
            aria-label="Send message"
          >
            {sendMessageMutation.isPending || isUploadingAttachment ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
      </div>

      {/* Full-Screen Image Lightbox Modal */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute right-2 -top-12 flex items-center gap-2">
              <a
                href={lightboxImageUrl}
                download="photo-attachment"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md hover:bg-white/30 transition"
              >
                <Download className="h-4 w-4" /> Download
              </a>
              <button
                type="button"
                onClick={() => setLightboxImageUrl(null)}
                className="rounded-lg bg-white/20 p-1.5 text-white backdrop-blur-md hover:bg-white/30 transition"
                aria-label="Close image preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={lightboxImageUrl}
              alt="Full size attachment preview"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Abuse Reporting Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2 text-red-600">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Report Conversation</h3>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Your safety is our priority. Reports are reviewed by the TrustHyre Trust & Safety team within 24 hours.
            </p>

            {reportSuccess ? (
              <div className="my-6 rounded-xl bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                ✓ Report submitted successfully. Our team will investigate immediately.
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reason for report
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="OFF_PLATFORM_COMMUNICATION">Asking to deal outside TrustHyre (WhatsApp/Cash)</option>
                    <option value="HARASSMENT_OR_ABUSE">Harassment, threats, or abusive language</option>
                    <option value="FRAUD_OR_SCAM">Suspicious identity or fraudulent job demands</option>
                    <option value="WAGE_DISPUTE">Wage lowering or work terms alteration</option>
                    <option value="OTHER">Other violation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Additional details (optional)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide context regarding the message or behavior..."
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reportSubmitting}
                    className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationThreadPage;
