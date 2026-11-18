import React, { useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  Briefcase,
  ShieldCheck,
  User,
  Building,
  ArrowRight,
  Loader2,
  Clock,
  UserPlus,
  Star,
  FileText,
  CheckCircle2,
  Filter,
  Sparkles
} from 'lucide-react';
import {
  useConversationInbox,
  useEmployerConversationContacts,
  conversationService,
  type ConversationItem,
  type CandidateContactHired,
  type CandidateContactApplicant
} from '../../../services/conversation.service';
import { ConversationThreadPage } from './ConversationThreadPage';
import { useUser } from '../../../providers/AuthContext';
import { BaseModal } from '../../../components/common/BaseModal';
import { toast } from 'sonner';

export const MessagesInboxPage: React.FC = () => {
  const { conversationId: routeConversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const isEmployer = user?.role === 'EMPLOYER';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(routeConversationId);
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'HIRED' | 'SHORTLISTED' | 'UNREAD'>('ALL');
  const [isSelectCandidateModalOpen, setIsSelectCandidateModalOpen] = useState(false);
  const [modalCandidateTab, setModalCandidateTab] = useState<'HIRED' | 'SHORTLISTED'>('HIRED');
  const [openingContactKey, setOpeningContactKey] = useState<string | null>(null);

  const { data, isLoading, refetch } = useConversationInbox();
  const conversations = data?.conversations || [];

  // Fetch employer's eligible contacts (Hired workers from work orders & Shortlisted applicants)
  const { data: contactsData, isLoading: isContactsLoading } = useEmployerConversationContacts(isEmployer);
  const hiredContacts = contactsData?.hired || [];
  const shortlistedContacts = contactsData?.shortlisted || [];

  // Synchronize route param with selection
  React.useEffect(() => {
    if (routeConversationId) {
      setSelectedConversationId(routeConversationId);
    } else if (conversations.length > 0 && window.innerWidth >= 1024 && !selectedConversationId) {
      // Auto-select first conversation on desktop if none selected
      setSelectedConversationId(conversations[0].id);
    }
  }, [routeConversationId, conversations.length, selectedConversationId]);

  const filteredConversations = useMemo(() => {
    let result = conversations;

    // Apply category filter tab
    if (activeFilterTab === 'HIRED') {
      result = result.filter(c => c.hiringStage === 'HIRED' || c.hiringStage === 'WORK_ORDER_SENT' || Boolean(c.workOrderId));
    } else if (activeFilterTab === 'SHORTLISTED') {
      result = result.filter(c => c.hiringStage === 'SHORTLISTED' || c.hiringStage === 'INTERVIEWING');
    } else if (activeFilterTab === 'UNREAD') {
      result = result.filter(c => c.unreadCount > 0);
    }

    // Apply text search
    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(c =>
      c.otherParty.name.toLowerCase().includes(q) ||
      c.jobTitle.toLowerCase().includes(q) ||
      c.lastMessagePreview?.body?.toLowerCase().includes(q)
    );
  }, [conversations, activeFilterTab, searchQuery]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    if (window.innerWidth < 1024) {
      navigate(`/messages/${id}`);
    } else {
      window.history.replaceState(null, '', `/messages/${id}`);
    }
  };

  const handleOpenContactChat = async (contact: CandidateContactHired | CandidateContactApplicant) => {
    const key = contact.type === 'HIRED_WORKER' ? contact.workOrderId : contact.applicationId;
    try {
      setOpeningContactKey(key);

      // If conversation already exists, jump straight to it
      if (contact.conversationId) {
        setIsSelectCandidateModalOpen(false);
        handleSelectConversation(contact.conversationId);
        return;
      }

      // Otherwise create or connect canonical conversation
      let convo: any;
      if (contact.type === 'HIRED_WORKER') {
        convo = await conversationService.getOrCreateByWorkOrder(contact.workOrderId);
      } else {
        convo = await conversationService.getOrCreateByApplication(contact.applicationId);
      }

      await refetch();
      setIsSelectCandidateModalOpen(false);
      handleSelectConversation(convo.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to open conversation');
    } finally {
      setOpeningContactKey(null);
    }
  };

  const formatMessageTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="mx-auto h-[calc(100vh-4rem)] max-w-7xl p-2 sm:p-4 md:p-6 font-['Onest',system-ui,sans-serif]">
      <div className="flex h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Left Column: Inbox List */}
        <div
          className={`flex h-full w-full flex-col border-r border-slate-200 dark:border-slate-800 lg:w-96 lg:flex-shrink-0 ${
            selectedConversationId && window.innerWidth < 1024 ? 'hidden' : 'flex'
          }`}
        >
          {/* Inbox Header */}
          <div className="border-b border-slate-200 p-4 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Messages</h1>
              </div>

              {isEmployer ? (
                <button
                  type="button"
                  onClick={() => setIsSelectCandidateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                  title="Start conversation with hired workers or shortlisted applicants"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Select Candidate</span>
                </button>
              ) : (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {conversations.length} {conversations.length === 1 ? 'chat' : 'chats'}
                </span>
              )}
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, role, or job..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
              />
            </div>

            {/* Filter Pills for Employer / User */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              <button
                type="button"
                onClick={() => setActiveFilterTab('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeFilterTab === 'ALL'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                All ({conversations.length})
              </button>

              {isEmployer && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab('HIRED')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      activeFilterTab === 'HIRED'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                    }`}
                  >
                    🤝 Hired
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveFilterTab('SHORTLISTED')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      activeFilterTab === 'SHORTLISTED'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 hover:bg-purple-100'
                    }`}
                  >
                    ⭐ Shortlisted
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setActiveFilterTab('UNREAD')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeFilterTab === 'UNREAD'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Unread
              </button>
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading ? (
              <div className="flex h-48 flex-col items-center justify-center space-y-2 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <span className="text-xs">Loading conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-500 dark:text-slate-400 space-y-3">
                <MessageSquare className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {searchQuery ? 'No matching conversations' : 'No conversations yet'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    {searchQuery
                      ? 'No active chats match your query.'
                      : isEmployer
                      ? 'You can message candidates who applied or workers you hired with a work order.'
                      : 'Apply for verified openings to unlock contextual messaging with hiring employers.'}
                  </p>
                </div>

                {isEmployer && (hiredContacts.length > 0 || shortlistedContacts.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setIsSelectCandidateModalOpen(true)}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Select Hired or Shortlisted Worker</span>
                  </button>
                )}
              </div>
            ) : (
              filteredConversations.map((c: ConversationItem) => {
                const isSelected = selectedConversationId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectConversation(c.id)}
                    className={`flex w-full items-start space-x-3 p-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/20' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {c.otherParty.photoUrl ? (
                        <img
                          src={c.otherParty.photoUrl}
                          alt={c.otherParty.name}
                          className="h-11 w-11 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 font-bold">
                          {c.otherParty.role === 'Employer' ? (
                            <Building className="h-5 w-5" />
                          ) : (
                            <User className="h-5 w-5" />
                          )}
                        </div>
                      )}
                      {c.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Chat Snippet */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className={`truncate text-sm font-bold ${c.unreadCount > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                            {c.otherParty.name}
                          </h3>
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                          {formatMessageTime(c.lastMessageAt)}
                        </span>
                      </div>

                      <div className="mt-0.5 flex items-center justify-between gap-1">
                        <div className="flex items-center text-xs text-slate-600 dark:text-slate-400 truncate">
                          <Briefcase className="mr-1 h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate font-medium">{c.jobTitle}</span>
                        </div>

                        {/* Stage Badge on Card */}
                        {c.hiringStage === 'HIRED' && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            🤝 Hired
                          </span>
                        )}
                        {c.hiringStage === 'WORK_ORDER_SENT' && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-sky-950/60 dark:text-sky-300">
                            📜 Work Order
                          </span>
                        )}
                        {c.hiringStage === 'SHORTLISTED' && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                            ⭐ Shortlisted
                          </span>
                        )}
                        {c.hiringStage === 'INTERVIEWING' && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                            📅 Interview
                          </span>
                        )}
                      </div>

                      <p className={`mt-1 truncate text-xs ${c.unreadCount > 0 ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {c.lastMessage?.body || c.lastMessagePreview?.body || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Thread Pane on Desktop */}
        <div className="hidden flex-1 flex-col overflow-hidden lg:flex">
          {selectedConversationId ? (
            <ConversationThreadPage
              conversationId={selectedConversationId}
              isSplitView={true}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
              <div className="mb-4 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/40">
                <ShieldCheck className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                TrustHyre Contextual Messaging
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
                Select a conversation on the left or click <strong className="text-slate-800 dark:text-slate-200 font-semibold">"Select Candidate"</strong> to connect with your hired workers and shortlisted applicants.
              </p>
              {isEmployer && (
                <button
                  type="button"
                  onClick={() => setIsSelectCandidateModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Select Candidate to Message</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Select Candidate to Message (Hired Workers & Shortlisted Applicants) */}
      {isSelectCandidateModalOpen && (
        <BaseModal
          isOpen={isSelectCandidateModalOpen}
          onClose={() => setIsSelectCandidateModalOpen(false)}
          title="Select Candidate to Message"
          subtitle="Choose from workers you hired or candidates shortlisted for your openings"
          icon={<UserPlus className="w-5 h-5 text-[#0f2f63] dark:text-sky-400" />}
          maxWidth="2xl"
          bodyClassName="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto"
        >
          {/* Tabs: Hired vs Shortlisted */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalCandidateTab('HIRED')}
              className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer text-center ${
                modalCandidateTab === 'HIRED'
                  ? 'border-[#0f2f63] text-[#0f2f63] dark:border-sky-400 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              🤝 Hired Workers ({hiredContacts.length})
            </button>
            <button
              type="button"
              onClick={() => setModalCandidateTab('SHORTLISTED')}
              className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer text-center ${
                modalCandidateTab === 'SHORTLISTED'
                  ? 'border-[#0f2f63] text-[#0f2f63] dark:border-sky-400 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              ⭐ Shortlisted Applicants ({shortlistedContacts.length})
            </button>
          </div>

          {/* List Content */}
          <div className="space-y-3 pt-2">
            {isContactsLoading ? (
              <div className="flex h-36 flex-col items-center justify-center space-y-2 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin text-[#0f2f63]" />
                <span className="text-xs">Loading eligible candidates...</span>
              </div>
            ) : modalCandidateTab === 'HIRED' ? (
              hiredContacts.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No hired workers found</p>
                  <p className="text-xs max-w-sm mx-auto">
                    When you issue a digital work order to a candidate, they will automatically appear here for direct messaging.
                  </p>
                </div>
              ) : (
                hiredContacts.map((contact) => {
                  const isOpening = openingContactKey === contact.workOrderId;
                  return (
                    <div
                      key={contact.workOrderId}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c0c0e] hover:border-slate-300 transition-all shadow-2xs gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {contact.photoUrl ? (
                          <img
                            src={contact.photoUrl}
                            alt={contact.workerName}
                            className="w-11 h-11 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center font-bold text-sm shrink-0">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {contact.workerName}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0">
                              {contact.workOrderStatus}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            {contact.jobTitle} • {contact.city || 'Remote/Onsite'}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            Work Order #{contact.orderNumber} • ₹{contact.wageAmount.toLocaleString('en-IN')}/{contact.wageFrequency.toLowerCase()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isOpening}
                        onClick={() => handleOpenContactChat(contact)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{isOpening ? 'Opening...' : contact.conversationId ? 'Open Chat' : 'Start Chat'}</span>
                      </button>
                    </div>
                  );
                })
              )
            ) : (
              shortlistedContacts.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 space-y-2">
                  <Star className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No shortlisted applicants</p>
                  <p className="text-xs max-w-sm mx-auto">
                    Shortlist candidate applications in your Job Management pipeline to enable 1-tap messaging here.
                  </p>
                </div>
              ) : (
                shortlistedContacts.map((contact) => {
                  const isOpening = openingContactKey === contact.applicationId;
                  return (
                    <div
                      key={contact.applicationId}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c0c0e] hover:border-slate-300 transition-all shadow-2xs gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {contact.photoUrl ? (
                          <img
                            src={contact.photoUrl}
                            alt={contact.workerName}
                            className="w-11 h-11 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 flex items-center justify-center font-bold text-sm shrink-0">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {contact.workerName}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 shrink-0">
                              {contact.applicationStatus}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            Applied for: <strong className="font-semibold text-slate-800 dark:text-slate-200">{contact.jobTitle}</strong>
                          </p>
                          {contact.skills && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                              Skills: {contact.skills}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isOpening}
                        onClick={() => handleOpenContactChat(contact)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{isOpening ? 'Opening...' : contact.conversationId ? 'Open Chat' : 'Start Chat'}</span>
                      </button>
                    </div>
                  );
                })
              )
            )}
          </div>
        </BaseModal>
      )}
    </div>
  );
};

export default MessagesInboxPage;
