import React, { useState } from 'react';
import {
  FileText,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  Clock,
  Sparkles,
  Share2,
  Check,
  CheckSquare,
  Square
} from 'lucide-react';
import { toast } from 'sonner';
import { BaseModal } from './BaseModal';
import {
  getTradeInterviewGuide,
  getJobSpecificDocuments,
  type TradeInterviewGuide,
  type DocumentItem
} from '../../constants/tradeInterviewGuides';

interface InterviewPrepKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade?: string;
  jobTitle: string;
  companyName: string;
  locationCity?: string;
  contactPhone?: string;
  requiredDocuments?: string[];
  payoutFrequency?: string;
  payoutGuaranteeBadge?: boolean;
}

export const InterviewPrepKitModal: React.FC<InterviewPrepKitModalProps> = ({
  isOpen,
  onClose,
  trade,
  jobTitle,
  companyName,
  locationCity = 'Local Worksite',
  contactPhone,
  requiredDocuments,
  payoutFrequency,
  payoutGuaranteeBadge = true
}) => {
  const guide: TradeInterviewGuide = getTradeInterviewGuide(trade || jobTitle);
  const documents: DocumentItem[] = getJobSpecificDocuments(requiredDocuments, guide.documents);
  const [activeTab, setActiveTab] = useState<'docs' | 'questions'>('docs');
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const toggleDoc = (docId: string) => {
    setCheckedDocs((prev) => ({
      ...prev,
      [docId]: !prev[docId]
    }));
  };

  const mandatoryCount = documents.filter((d) => d.isMandatory).length;
  const packedMandatoryCount = documents.filter(
    (d) => d.isMandatory && checkedDocs[d.id]
  ).length;
  const isReady = packedMandatoryCount >= mandatoryCount;

  const getWhatsAppShareText = () => {
    let text = `📋 *INTERVIEW PREPARATION KIT & PACKING LIST*\n`;
    text += `Role: *${jobTitle}* at *${companyName}*\n`;
    text += `Trade Track: ${guide.tradeTitle}\n\n`;

    text += `📁 *MANDATORY DOCUMENTS TO CARRY:*\n`;
    documents.forEach((d) => {
      text += `• ${d.name} ${d.isMandatory ? '*(Required)*' : ''}\n  ${d.description}\n`;
    });

    text += `\n❓ *KEY TRIAL QUESTIONS TO PREPARE:*\n`;
    guide.questions.slice(0, 3).forEach((q, idx) => {
      text += `${idx + 1}. ${q.question}\n   Tip: ${q.practicalTip}\n`;
    });

    text += `\n⏰ *HR CALLING ADVICE:*\n${guide.hrCallingAdvice}\n`;
    text += `\nPowered by TrustHyre Frontline Career Suite`;

    return encodeURIComponent(text);
  };

  const handleCopy = () => {
    let raw = `INTERVIEW PREPARATION KIT: ${jobTitle} (${companyName})\n\n`;
    raw += `DOCUMENTS TO CARRY:\n`;
    documents.forEach((d) => {
      raw += `- ${d.name} (${d.isMandatory ? 'Mandatory' : 'Bonus'}): ${d.description}\n`;
    });
    raw += `\nTRIAL QUESTIONS:\n`;
    guide.questions.forEach((q, idx) => {
      raw += `${idx + 1}. ${q.question} - Tip: ${q.practicalTip}\n`;
    });

    navigator.clipboard.writeText(raw);
    setCopied(true);
    toast.success('Interview Prep Kit copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={guide.tradeTitle}
      subtitle={`For: ${jobTitle} • ${companyName}`}
      icon={<CheckCircle2 className="w-5 h-5 text-[#0066ff] dark:text-[#38BDF8]" />}
      iconBgColor="bg-[#eff6ff] dark:bg-blue-950/40 text-[#0066ff] dark:text-[#38BDF8] border border-[#dbeafe] dark:border-blue-900/40"
      maxWidth="lg"
      bodyClassName="p-0 flex flex-col bg-white dark:bg-[#1C1C21] text-[#0A1931] dark:text-zinc-100"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-[#F8FAFC] dark:bg-zinc-800 border border-[#e6e8ec] dark:border-zinc-700 text-[#0A1931] dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-700 hover:border-slate-300 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <Copy className="w-3.5 h-3.5 text-[#0066ff] dark:text-[#38BDF8]" />
              <span>{copied ? 'Copied Kit!' : 'Copy Text'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-[#F8FAFC] dark:bg-zinc-800 border border-[#e6e8ec] dark:border-zinc-700 text-[#0A1931] dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-700 hover:border-slate-300 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-[#717784] dark:text-zinc-400" />
              <span>Print</span>
            </button>
          </div>

          <a
            href={`https://wa.me/?text=${getWhatsAppShareText()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider bg-[#0f2f63] hover:bg-[#0066ff] active:bg-[#003d99] text-white shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-95 no-underline"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Send Kit to WhatsApp</span>
          </a>
        </div>
      }
    >
      {/* Readiness Meter & Calling Window */}
      <div className="px-5 py-3 bg-[#F8FAFC] dark:bg-[#121215] border-b border-[#e6e8ec] dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#0A1931] dark:text-white">
            Document Readiness:
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
              isReady
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60'
            }`}
          >
            {packedMandatoryCount}/{mandatoryCount} Required Ready
          </span>
          {payoutFrequency && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eff6ff] dark:bg-blue-950/50 text-[#0066ff] dark:text-[#38BDF8] border border-[#dbeafe] dark:border-blue-900/50">
              {payoutFrequency} Pay
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[#717784] dark:text-zinc-400 font-medium text-[11px]">
          <Clock className="w-3.5 h-3.5 text-[#0066ff] dark:text-[#38BDF8]" />
          <span>{guide.hrCallingAdvice.split('.')[0]}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#e6e8ec] dark:border-zinc-800 bg-[#F8FAFC] dark:bg-[#121215]">
        <button
          onClick={() => setActiveTab('docs')}
          className={`flex-1 py-3 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'docs'
              ? 'border-[#0066ff] text-[#0066ff] dark:text-[#38BDF8] bg-white dark:bg-[#1C1C21]'
              : 'border-transparent text-[#717784] dark:text-zinc-400 hover:text-[#0A1931] dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Documents to Carry ({documents.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex-1 py-3 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'questions'
              ? 'border-[#0066ff] text-[#0066ff] dark:text-[#38BDF8] bg-white dark:bg-[#1C1C21]'
              : 'border-transparent text-[#717784] dark:text-zinc-400 hover:text-[#0A1931] dark:hover:text-white'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Top 5 Trial Questions</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="p-4 sm:p-5 space-y-3 max-h-[60vh] overflow-y-auto">
        {activeTab === 'docs' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#717784] dark:text-zinc-400 pb-1">
              <span>Check off documents you have packed in your folder:</span>
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                * Original + 2 Photocopies
              </span>
            </div>

            {documents.map((doc) => {
              const isChecked = !!checkedDocs[doc.id];
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleDoc(doc.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    isChecked
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 shadow-2xs'
                      : 'border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#16161A] hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-[#F8FAFC] dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0">
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 fill-emerald-100 dark:fill-emerald-900/60" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 dark:text-zinc-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs sm:text-sm font-bold leading-tight ${
                          isChecked
                            ? 'text-emerald-950 dark:text-emerald-200'
                            : 'text-[#0A1931] dark:text-white'
                        }`}
                      >
                        {doc.name}
                      </span>
                      {doc.isMandatory ? (
                        <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
                          Required
                        </span>
                      ) : (
                        <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                          Bonus
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#717784] dark:text-zinc-400 mt-1 leading-relaxed">
                      {doc.description}
                    </p>
                  </div>
                </div>
              );
            })}

            {!isReady && (
              <div className="mt-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Avoid Interview Rejection:</strong> Frontline candidates without original ID and bank passbook are typically turned away at the company security gate.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-[#717784] dark:text-zinc-400 pb-1">
              Common questions supervisors ask during trial calls and practical walk-ins:
            </div>

            {guide.questions.map((q, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 bg-[#F8FAFC] dark:bg-[#16161A] space-y-2 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"
              >
                <h4 className="text-xs sm:text-sm font-bold text-[#0A1931] dark:text-white">
                  {q.question}
                </h4>
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-xs text-[#0f2f63] dark:text-blue-200 leading-relaxed">
                  <span className="font-bold">💡 What HR wants to hear:</span> {q.practicalTip}
                </div>
                <div className="text-xs text-[#717784] dark:text-zinc-400 pl-1 leading-relaxed">
                  <span className="font-semibold text-[#0A1931] dark:text-white">
                    Sample winning answer:
                  </span>{' '}
                  {q.sampleAnswerSummary}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BaseModal>
  );
};
