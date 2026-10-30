import { useState, useRef, useEffect } from 'react';
import { useAppNotifications } from '../../../../hooks/useAppNotifications';
import { type AppNotification } from '../../../../services/notification.service';
import { 
    Bell, 
    BellOff, 
    CheckCircle2, 
    Info, 
    AlertTriangle, 
    Clock, 
    RefreshCw, 
    Trash2, 
    CheckCheck, 
    Briefcase, 
    Award, 
    ShieldCheck,
    ChevronRight,
    Settings,
    ExternalLink,
    Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fcmService } from '../../../../services/fcm.service';

export const NotificationCenter = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);

    // Centralized notification hook with 5-min stale cache and direct cache patching
    const {
        notifications,
        unreadCount,
        isRefetching,
        refetch,
        markRead,
        markAllRead,
        deleteNotification,
        deleteAll
    } = useAppNotifications();

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleNotificationClick = (n: AppNotification) => {
        setIsOpen(false);
        markRead(n.id);

        let targetLink = n.link;
        if (targetLink) {
            // Map legacy dashboard employer links to canonical /jobs routes
            if (targetLink.includes('/dashboard/employer/jobs')) {
                const match = targetLink.match(/\/dashboard\/employer\/jobs\/([^/]+)/);
                if (match && match[1] && match[1] !== 'applicants') {
                    targetLink = `/jobs/${match[1]}/applicants`;
                } else {
                    targetLink = '/jobs';
                }
            }
            navigate(targetLink);
            return;
        }

        const t = n.type?.toUpperCase();
        if (t === 'APPLICATION_SUBMITTED' || t === 'APPLICATION_UPDATE' || t === 'APPLICATION_ACCEPTED' || t === 'APPLICATION_SHORTLISTED') {
            navigate('/applied-jobs');
        } else if (t === 'NEW_APPLICATION') {
            const dataJobId = (n as any).data?.jobId || (n as any).data?.job_id;
            if (dataJobId) {
                navigate(`/jobs/${dataJobId}/applicants`);
            } else {
                navigate('/jobs');
            }
        } else if (t === 'JOB_POSTED') {
            navigate('/jobs');
        } else if (t === 'NEW_JOB' || t === 'JOB_MATCH' || t === 'JOB_MATCH_ALERT' || t === 'APPLICATION_REJECTED') {
            navigate('/search');
        } else if (t === 'CANDIDATE_MATCH_ALERT' || t === 'CANDIDATE_ALERT' || t === 'NEW_CANDIDATE') {
            navigate('/find-workers');
        } else if (t === 'WELCOME' || t === 'KYC_VERIFIED' || t === 'KYC_REJECTED' || t === 'SKILL_BADGE_EARNED') {
            navigate('/profile');
        } else if (t === 'SECURITY_ALERT') {
            navigate('/settings');
        }
    };

    const getIcon = (type?: string) => {
        const t = type?.toUpperCase();
        if (t === 'SUCCESS' || t === 'APPLICATION_ACCEPTED' || t === 'APPLICATION_SUBMITTED' || t === 'NEW_APPLICATION') {
            return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
        }
        if (t === 'JOB_MATCH_ALERT' || t === 'JOB_POSTED' || t === 'NEW_JOB') {
            return <Briefcase className="w-4 h-4 text-blue-600" />;
        }
        if (t === 'CANDIDATE_MATCH_ALERT' || t === 'CANDIDATE_ALERT' || t === 'NEW_CANDIDATE') {
            return <Users className="w-4 h-4 text-indigo-600" />;
        }
        if (t === 'SKILL_BADGE_EARNED') {
            return <Award className="w-4 h-4 text-amber-500" />;
        }
        if (t === 'KYC_VERIFIED') {
            return <ShieldCheck className="w-4 h-4 text-blue-600" />;
        }
        if (t === 'WARNING' || t === 'KYC_REJECTED') {
            return <AlertTriangle className="w-4 h-4 text-amber-500" />;
        }
        if (t === 'INFO' || t === 'APPLICATION_UPDATE' || t === 'WELCOME') {
            return <Info className="w-4 h-4 text-[#0f2f63]" />;
        }
        return <Bell className="w-4 h-4 text-[#0f2f63]" />;
    };

    return (
        <div className="relative font-['Onest',system-ui,sans-serif]" ref={containerRef}>
            {/* Bell Trigger Button */}
            <button 
                onClick={() => {
                    const nextState = !isOpen;
                    setIsOpen(nextState);
                    if (nextState) {
                        refetch();
                    }
                }}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all relative cursor-pointer border ${
                    isOpen 
                        ? 'bg-blue-50 text-[#0f2f63] border-blue-200 shadow-xs' 
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200/80 shadow-2xs'
                }`}
                title="Notifications"
            >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-white shadow-xs animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Popover Dropdown - Fully Responsive */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.12 }}
                        className="fixed inset-x-3 top-16 sm:inset-x-auto sm:absolute sm:right-0 sm:top-full sm:mt-2.5 w-auto sm:w-88 md:w-96 max-w-[calc(100vw-1.5rem)] bg-white border border-slate-200/90 rounded-2xl shadow-2xl z-50 overflow-hidden text-[#0A1931]"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                            <div className="flex items-center gap-2">
                                <h4 className="text-xs font-black text-[#0A1931] tracking-tight">
                                    Notifications
                                </h4>
                                {unreadCount > 0 ? (
                                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0f2f63] border border-blue-100 text-[10px] font-bold">
                                        {unreadCount} new
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-medium text-slate-400">
                                        ({notifications.length})
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        navigate('/notifications');
                                    }}
                                    className="text-[11px] font-bold text-[#0f2f63] hover:underline flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer mr-1"
                                    title="Open Full Page"
                                >
                                    <span>Inbox</span>
                                    <ExternalLink className="w-3 h-3" />
                                </button>

                                {unreadCount > 0 && (
                                    <button 
                                        onClick={() => markAllRead()}
                                        className="text-[11px] font-bold text-slate-600 hover:text-[#0f2f63] flex items-center gap-1 px-1.5 py-1 rounded cursor-pointer transition-colors"
                                        title="Mark all as read"
                                    >
                                        <CheckCheck className="w-3 h-3" />
                                        <span className="hidden sm:inline">Read all</span>
                                    </button>
                                )}
                                <button 
                                    onClick={() => refetch()}
                                    className="p-1 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer text-slate-500 hover:text-slate-800"
                                    title="Refresh"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-[#0f2f63]' : ''}`} />
                                </button>
                                {notifications.length > 0 && (
                                    <button 
                                        onClick={() => deleteAll()}
                                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                        title="Clear All"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Push Permission Prompt if not yet granted */}
                        {fcmService.isPushSupported() && typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
                            <div className="px-4 py-2 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Bell className="w-3.5 h-3.5 text-[#0f2f63] shrink-0" />
                                    <span className="text-[11px] text-[#0A1931] font-medium truncate">
                                        Push alerts are disabled
                                    </span>
                                </div>
                                <button
                                    onClick={async () => {
                                        await fcmService.requestPushPermissionAndRegister();
                                    }}
                                    className="px-2.5 py-1 bg-[#0f2f63] text-white text-[10px] font-bold rounded-lg hover:bg-[#0f2f63] transition-all cursor-pointer shrink-0 shadow-2xs"
                                >
                                    Enable
                                </button>
                            </div>
                        )}
                        
                        {/* Notification List Body */}
                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                            {notifications.length > 0 ? (
                                notifications.map((n) => {
                                    const isRead = Boolean(n.isRead || (n as any).is_read);
                                    const createdAt = n.createdAt || (n as any).created_at;
                                    return (
                                        <div 
                                            key={n.id} 
                                            onClick={() => handleNotificationClick(n)}
                                            className={`p-3.5 transition-all hover:bg-slate-50 cursor-pointer flex gap-3 items-start group ${
                                                isRead ? 'opacity-65 bg-white' : 'bg-blue-50/20'
                                            }`}
                                        >
                                            <div className="mt-0.5 w-8 h-8 shrink-0 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shadow-2xs">
                                                {getIcon(n.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className={`text-xs font-bold leading-snug truncate ${isRead ? 'text-slate-700' : 'text-[#0A1931]'}`}>
                                                        {n.title}
                                                    </p>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteNotification(n.id);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-600 text-slate-400 transition-opacity"
                                                        title="Dismiss"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-0.5">{n.message}</p>
                                                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    <span>
                                                        {createdAt ? formatDistanceToNow(new Date(createdAt), { addSuffix: true }) : 'just now'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-8 text-center space-y-2">
                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                        <BellOff className="w-5 h-5" />
                                    </div>
                                    <p className="text-xs font-bold text-[#0A1931]">All caught up!</p>
                                    <p className="text-[11px] text-slate-500 font-medium">No new notifications right now.</p>
                                </div>
                            )}
                        </div>

                        {/* Dedicated Footer Navigation to Full Notifications Page & Settings */}
                        <div className="p-2.5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between gap-2">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/notifications');
                                }}
                                className="flex-1 py-2 px-3 text-xs font-bold text-[#0f2f63] hover:bg-blue-50/80 bg-white border border-blue-200/60 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer group"
                            >
                                <span>View All Notifications</span>
                                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/settings?tab=notifications');
                                }}
                                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200/60 transition-colors cursor-pointer shadow-2xs"
                                title="Notification Settings"
                            >
                                <Settings className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
