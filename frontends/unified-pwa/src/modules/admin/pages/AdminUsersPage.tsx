import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../../services/admin.service';
import { 
  Users, Search, ShieldCheck, Mail, Phone, Calendar, Loader2, 
  UserPlus, X, Lock, CheckCircle2, Share2, Copy, Send, Check, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLoader } from '../../../components/common/AppLoader';
import { useAuth } from '../../../providers/AuthContext';
import { ConfirmModal } from '../../../components/common/ConfirmModal';

export const AdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.email?.toLowerCase() === 'admin@trusthyre.com';
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'invite' | 'direct'>('invite');
  const [userToDelete, setUserToDelete] = useState<any | null>(null);

  // Form states
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    sendEmailNotification: true
  });

  const [generatedInvite, setGeneratedInvite] = useState<{
    email: string;
    inviteLink: string;
    token: string;
    emailDelivered: boolean;
  } | null>(null);

  const [isCopied, setIsCopied] = useState(false);

  const [directForm, setDirectForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['adminUsers', selectedRole, searchQuery],
    queryFn: () => adminService.getUsers({ role: selectedRole, q: searchQuery }),
  });

  // Invitation Mutation
  const inviteAdminMutation = useMutation({
    mutationFn: (data: typeof inviteForm) => adminService.inviteAdmin(data),
    onSuccess: (data) => {
      const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/admin/accept-invite?token=${data.token}`
        : data.inviteLink;

      setGeneratedInvite({
        email: data.email,
        inviteLink: shareUrl,
        token: data.token,
        emailDelivered: data.emailDelivered
      });
      if (data.emailDelivered) {
        toast.success(`Invitation email delivered to ${data.email}!`);
      } else {
        toast.info(`Invitation generated! Share the link directly with the administrator.`);
      }
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create administrator invitation';
      toast.error(msg);
    },
  });

  // Delete User Mutation with optimistic TanStack Query cache patching
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => adminService.deleteUser(userId),
    onSuccess: (_data, deletedUserId) => {
      toast.success('User account and related data deleted successfully');
      setUserToDelete(null);

      // Optimistically patch/filter out the deleted user across all active adminUsers query caches
      queryClient.setQueriesData<any[]>({ queryKey: ['adminUsers'] }, (old: any[] | undefined) => {
        if (!Array.isArray(old)) return old;
        return old.filter((u) => u.id !== deletedUserId);
      });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete user account';
      toast.error(msg);
    },
  });

  const handleDeleteUser = (user: any) => {
    setUserToDelete(user);
  };

  // Direct Creation Mutation (Legacy)
  const createAdminMutation = useMutation({
    mutationFn: (data: typeof directForm) => adminService.createAdmin(data),
    onSuccess: () => {
      toast.success('Administrator account created successfully');
      setIsModalOpen(false);
      setDirectForm({ firstName: '', lastName: '', email: '', password: '' });
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Failed to create administrator account';
      toast.error(msg);
    },
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    inviteAdminMutation.mutate(inviteForm);
  };

  const handleDirectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directForm.email || !directForm.password) {
      toast.error('Email and password are required');
      return;
    }
    if (directForm.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    createAdminMutation.mutate(directForm);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success('Invitation link copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const roleTabs = [
    { label: 'All Users', value: 'ALL' },
    { label: 'Trade Candidates', value: 'WORKER' },
    { label: 'Hiring Employers', value: 'EMPLOYER' },
    { label: 'Administrators', value: 'ADMIN' },
  ];

  return (
    <div className="space-y-6 font-['Onest',system-ui,sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563c9]" />
            <span>Identity Registry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#0a0a0a] tracking-tight">
            User Directory
          </h1>
          <p className="text-xs sm:text-sm text-[#717784] mt-1 leading-relaxed">
            Manage all verified candidates, registered employers, and administrator accounts across the ecosystem.
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => {
              setIsModalOpen(true);
              setGeneratedInvite(null);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium uppercase tracking-wider bg-[#0f2f63] hover:bg-[#2563c9] text-white shadow-xs transition-all cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Administrator</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="inline-flex p-1 rounded-full bg-[#f4f4f4] border border-[#e6e8ec] overflow-x-auto max-w-full">
          {roleTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedRole(tab.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                selectedRole === tab.value
                  ? 'bg-[#0f2f63] text-white shadow-xs'
                  : 'text-[#717784] hover:text-[#0a0a0a]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#f4f4f4]/60 hover:bg-[#f4f4f4] focus:bg-white border border-[#e6e8ec] focus:border-[#0f2f63] rounded-full px-4 py-2 pl-9 text-xs text-[#0a0a0a] placeholder:text-[#9ea3ae] transition-colors outline-hidden"
          />
          <Search className="w-3.5 h-3.5 text-[#9ea3ae] absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Users Table / List */}
      <div className="bg-white rounded-2xl border border-[#e6e8ec] overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <AppLoader />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#f4f4f4] flex items-center justify-center mx-auto text-[#717784]">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-[#717784]">No user profiles match your filter criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e6e8ec] bg-[#f8f9fa] text-[11px] font-bold uppercase tracking-wider text-[#717784]">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e8ec] text-xs">
                {users.map((u: any) => {
                  const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Unnamed Member';
                  const roleBadgeStyles: Record<string, string> = {
                    WORKER: 'bg-blue-50 text-[#0f2f63] border-blue-100',
                    EMPLOYER: 'bg-purple-50 text-purple-700 border-purple-100',
                    ADMIN: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                    SUPER_ADMIN: 'bg-amber-50 text-amber-700 border-amber-100',
                  };
                  return (
                    <tr key={u.id} className="hover:bg-[#f8f9fa]/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#f4f4f4] border border-[#e6e8ec] flex items-center justify-center text-[11px] font-bold text-[#0f2f63] overflow-hidden shrink-0">
                            {u.profile_image_url ? (
                              <img src={u.profile_image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              fullName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-[#0a0a0a]">{fullName}</p>
                            <p className="text-[10px] text-[#717784] font-mono">{u.id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#717784]">
                        <p className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-[#9ea3ae]" />
                          <span>{u.email}</span>
                        </p>
                        {u.phone_number && (
                          <p className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                            <Phone className="w-3 h-3 text-[#9ea3ae]" />
                            <span>{u.phone_number}</span>
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${roleBadgeStyles[u.role] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${u.email_verified ? 'text-emerald-700' : 'text-amber-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.email_verified ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                          <span>{u.email_verified ? 'Verified' : 'Pending'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#717784] text-[11px]">
                        {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isSuperAdmin && u.id !== user?.id && u.email?.toLowerCase() !== user?.email?.toLowerCase() ? (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={deleteUserMutation.isPending && (deleteUserMutation.variables as string) === u.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer inline-flex items-center justify-center disabled:opacity-40"
                            title={`Delete ${u.email}`}
                          >
                            {deleteUserMutation.isPending && (deleteUserMutation.variables as string) === u.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-mono select-none">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provisioning / Invitation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-[#e6e8ec] shadow-xl w-full max-w-lg overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#e6e8ec] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0a0a0a]">Administrator Provisioning</h3>
                <p className="text-xs text-[#717784]">Grant secure administrative access to platform operations</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#717784] hover:bg-[#f4f4f4] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If an invitation has just been generated, show the shareable result */}
            {generatedInvite ? (
              <div className="p-6 space-y-4">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-emerald-900">Administrator Invitation Created</p>
                    <p className="text-xs text-emerald-700">
                      {generatedInvite.emailDelivered 
                        ? `An official invitation email has been dispatched via Brevo to ${generatedInvite.email}.`
                        : `Invitation is active for ${generatedInvite.email}. Share the link below to complete onboarding.`}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#717784]">
                    Shareable Invitation Link (WhatsApp / Slack / Direct)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedInvite.inviteLink}
                      className="flex-1 bg-[#f8f9fa] border border-[#e6e8ec] rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none select-all"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedInvite.inviteLink)}
                      className="px-4 py-2 bg-[#0f2f63] hover:bg-[#1a4484] text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-[#717784]">
                    Valid for 48 hours. The invited administrator will configure their own private password upon opening.
                  </p>
                </div>

                <div className="pt-3 border-t border-[#e6e8ec] flex justify-end">
                  <button
                    onClick={() => {
                      setGeneratedInvite(null);
                      setIsModalOpen(false);
                    }}
                    className="px-5 py-2 rounded-full bg-[#0f2f63] text-white text-xs font-bold uppercase tracking-wider"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Mode Selector Tabs */}
                <div className="flex border-b border-[#e6e8ec] px-5 pt-3 gap-6 bg-[#f8f9fa]">
                  <button
                    onClick={() => setActiveTab('invite')}
                    className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === 'invite'
                        ? 'border-[#0f2f63] text-[#0f2f63]'
                        : 'border-transparent text-[#717784] hover:text-[#0a0a0a]'
                    }`}
                  >
                    Send Invitation Link (Recommended)
                  </button>
                  <button
                    onClick={() => setActiveTab('direct')}
                    className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === 'direct'
                        ? 'border-[#0f2f63] text-[#0f2f63]'
                        : 'border-transparent text-[#717784] hover:text-[#0a0a0a]'
                    }`}
                  >
                    Direct Account Setup
                  </button>
                </div>

                {activeTab === 'invite' ? (
                  /* Secure Invitation Form */
                  <form onSubmit={handleInviteSubmit} className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold uppercase text-[#0a0a0a]">First Name</label>
                        <input
                          type="text"
                          value={inviteForm.firstName}
                          onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                          placeholder="John"
                          className="w-full bg-[#f8f9fa] focus:bg-white border border-[#e6e8ec] focus:border-[#0f2f63] rounded-xl px-3.5 py-2 text-xs text-[#0a0a0a] outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold uppercase text-[#0a0a0a]">Last Name</label>
                        <input
                          type="text"
                          value={inviteForm.lastName}
                          onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                          placeholder="Doe"
                          className="w-full bg-[#f8f9fa] focus:bg-white border border-[#e6e8ec] focus:border-[#0f2f63] rounded-xl px-3.5 py-2 text-xs text-[#0a0a0a] outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-[#0a0a0a]">Email Address</label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={inviteForm.email}
                          onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                          placeholder="candidate.admin@trusthyre.com"
                          className="w-full bg-[#f8f9fa] focus:bg-white border border-[#e6e8ec] focus:border-[#0f2f63] rounded-xl px-3.5 py-2 pl-9 text-xs text-[#0a0a0a] outline-none"
                        />
                        <Mail className="w-4 h-4 text-[#9ea3ae] absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="sendEmailNotification"
                        checked={inviteForm.sendEmailNotification}
                        onChange={(e) => setInviteForm({ ...inviteForm, sendEmailNotification: e.target.checked })}
                        className="rounded border-[#e6e8ec] text-[#0f2f63] focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="sendEmailNotification" className="text-xs text-[#717784] cursor-pointer">
                        Send branded Brevo email with invitation button
                      </label>
                    </div>

                    <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#e6e8ec]">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-[#717784] hover:bg-[#f4f4f4]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={inviteAdminMutation.isPending}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-[#0f2f63] hover:bg-[#1a4484] text-white shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {inviteAdminMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Generate & Send Invite</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Direct Manual Setup */
                  <form onSubmit={handleDirectSubmit} className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold uppercase text-[#0a0a0a]">First Name</label>
                        <input
                          type="text"
                          required
                          value={directForm.firstName}
                          onChange={(e) => setDirectForm({ ...directForm, firstName: e.target.value })}
                          placeholder="John"
                          className="w-full bg-[#f8f9fa] focus:bg-white border border-[#e6e8ec] focus:border-[#0f2f63] rounded-xl px-3.5 py-2 text-xs text-[#0a0a0a] outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold uppercase text-[#0a0a0a]">Last Name</label>
                        <input
                          type="text"
                          value={directForm.lastName}
                          onChange={(e) => setDirectForm({ ...directForm, lastName: e.target.value })}
                          placeholder="Doe"
                          className="w-full bg-[#f8f9fa] focus:bg-white border border-[#e6e8ec] focus:border-[#0f2f63] rounded-xl px-3.5 py-2 text-xs text-[#0a0a0a] outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-[#0a0a0a]">Email Address</label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={directForm.email}
                          onChange={(e) => setDirectForm({ ...directForm, email: e.target.value })}
                          placeholder="admin@trusthyre.com"
                          className="w-full bg-[#f8f9fa] focus:bg-white border border-[#e6e8ec] focus:border-[#0f2f63] rounded-xl px-3.5 py-2 pl-9 text-xs text-[#0a0a0a] outline-none"
                        />
                        <Mail className="w-4 h-4 text-[#9ea3ae] absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-[#0a0a0a]">Initial Password</label>
                      <div className="relative">
                        <input
                          type="password"
                          required
                          minLength={8}
                          value={directForm.password}
                          onChange={(e) => setDirectForm({ ...directForm, password: e.target.value })}
                          placeholder="••••••••••••"
                          className="w-full bg-[#f8f9fa] focus:bg-white border border-[#e6e8ec] focus:border-[#0f2f63] rounded-xl px-3.5 py-2 pl-9 text-xs text-[#0a0a0a] outline-none"
                        />
                        <Lock className="w-4 h-4 text-[#9ea3ae] absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                      <p className="text-[10px] text-[#717784] mt-1">Minimum 8 characters.</p>
                    </div>

                    <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#e6e8ec]">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-[#717784] hover:bg-[#f4f4f4]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={createAdminMutation.isPending}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-[#0f2f63] hover:bg-[#1a4484] text-white shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {createAdminMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span>Create Admin User</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

          </div>
        </div>
      )}
      {/* Standardized Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(userToDelete)}
        title="Delete User Account"
        description="Are you sure you want to permanently delete this user account? This action will remove all profile details, saved preferences, and associated job applications."
        entityName={userToDelete ? `${[userToDelete.first_name, userToDelete.last_name].filter(Boolean).join(' ') || 'User'} (${userToDelete.email})` : undefined}
        confirmText="Delete Account"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={deleteUserMutation.isPending}
        onConfirm={() => {
          if (userToDelete?.id) {
            deleteUserMutation.mutate(userToDelete.id);
          }
        }}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
};
