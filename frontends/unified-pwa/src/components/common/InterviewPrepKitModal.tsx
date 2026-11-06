import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Share2,
  FileText,
  HelpCircle,
  Clock,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer
} from 'lucide-react';
import { getTradeInterviewGuide, type TradeInterviewGuide } from '../../constants/tradeInterviewGuides';
import { BaseModal } from './BaseModal';

interface InterviewPrepKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: string;
  companyName: string;
  locationCity?: string;
  contactPhone?: string;
}

export const InterviewPrepKitModal: React.FC<InterviewPrepKitModalProps> = ({
  isOpen,
  onClose,
  jobTitle,
  companyName,
  locationCity = 'Local Worksite',
  contactPhone
}) => {
  const guide: TradeInterviewGuide = getTradeInterviewGuide(jobTitle);

  const [activeTab, setActiveTab] = useState<'docs' | 'questions'>('docs');
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({
    aadhaar: true,
    bank_passbook: true
  });
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const toggleDoc = (id: string) => {
    setCheckedDocs((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const mandatoryCount = guide.documents.filter((d) => d.isMandatory).length;
  const packedMandatoryCount = guide.documents.filter(
    (d) => d.isMandatory && checkedDocs[d.id]
  ).length;
  const isReady = packedMandatoryCount === mandatoryCount;

  // Format WhatsApp Share text
  const getWhatsAppShareText = () => {
    let text = `📋 *INTERVIEW PREP & DOCUMENT CHECKLIST*\n`;
    text += `*Job:* ${jobTitle} at ${companyName} (${locationCity})\n\n`;

    text += `📁 *Mandatory Documents to Carry:*\n`;
    guide.documents.forEach((doc, idx) => {
      const status = checkedDocs[doc.id] ? '✅' : '⬜';
      text += `${status} ${idx + 1}. ${doc.name} ${doc.isMandatory ? '(Compulsory)' : '(Optional)'}\n`;
    });

    text += `\n🎯 *Top 5 Expected Interview Questions:*\n`;
    guide.questions.forEach((q) => {
      text += `• ${q.question}\n   💡 Tip: ${q.practicalTip}\n\n`;
    });

    if (contactPhone) {
      text += `📞 *HR Contact:* ${contactPhone}\n`;
    }
    text += `🕒 *Calling Advice:* ${guide.hrCallingAdvice}\n\n`;
    text += `Sent via TrustHyre Frontline Carrier`;

    return encodeURIComponent(text);
  };

  const handleCopy = () => {
    let plainText = `INTERVIEW PREP & DOCUMENT CHECKLIST\n`;
    plainText += `Job: ${jobTitle} at ${companyName}\n\n`;
    plainText += `DOCUMENTS CHECKLIST:\n`;
    guide.documents.forEach((d) => {
      plainText += `[${checkedDocs[d.id] ? 'X' : ' '}] ${d.name}\n`;
    });
    plainText += `\nQUESTIONS TO PREPARE:\n`;
    guide.questions.forEach((q) => {
      plainText += `${q.question}\nTip: ${q.practicalTip}\n\n`;
    });

    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={guide.tradeTitle}
      subtitle={`For: ${jobTitle} • ${companyName}`}
      icon={<CheckCircle2 className="w-5 h-5 text-[#0066ff]" />}
      iconBgColor="bg-[#eff6ff] text-[#0066ff] border border-[#dbeafe]"
      maxWidth="lg"
      bodyClassName="p-0 flex flex-col bg-white"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-white border border-[#e6e8ec] text-[#0A1931] hover:bg-[#F8FAFC] transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied Kit!' : 'Copy Text'}
            </button>
            <button
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-white border border-[#e6e8ec] text-[#0A1931] hover:bg-[#F8FAFC] transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>

          <a
            href={`https://wa.me/?text=${getWhatsAppShareText()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm bg-[#0066ff] hover:bg-[#0052cc] active:bg-[#003d99] text-white shadow-md transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            Send Kit to WhatsApp
          </a>
        </div>
      }
    >
      {/* Readiness Meter & Calling Window */}
      <div className="px-5 py-2.5 bg-[#F8FAFC] border-b border-[#e6e8ec] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#0A1931]">
            Document Readiness:
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full font-bold ${
              isReady
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-900'
            }`}
          >
            {packedMandatoryCount}/{mandatoryCount} Required Ready
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[#717784]">
          <Clock className="w-3.5 h-3.5 text-[#0066ff]" />
          <span className="font-medium">{guide.hrCallingAdvice.split('.')[0]}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#e6e8ec] bg-[#F8FAFC]">
        <button
          onClick={() => setActiveTab('docs')}
          className={`flex-1 py-3 px-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'docs'
              ? 'border-[#0066ff] text-[#0066ff] bg-white'
              : 'border-transparent text-[#717784] hover:text-[#0A1931]'
          }`}
        >
          <FileText className="w-4 h-4" />
          Documents to Carry ({guide.documents.length})
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex-1 py-3 px-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'questions'
              ? 'border-[#0066ff] text-[#0066ff] bg-white'
              : 'border-transparent text-[#717784] hover:text-[#0A1931]'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Top 5 Trial Questions
        </button>
      </div>

      {/* Tab Body */}
      <div className="p-4 sm:p-5 space-y-3">
        {activeTab === 'docs' ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[#717784] pb-1">
              <span>Check off documents you have packed in your folder:</span>
              <span className="text-[11px] text-amber-700 font-medium">
                * Original + 2 Photocopies
              </span>
            </div>

            {guide.documents.map((doc) => {
              const isChecked = !!checkedDocs[doc.id];
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleDoc(doc.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    isChecked
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-[#e6e8ec] bg-[#F8FAFC] hover:border-slate-300'
                  }`}
                >
                  <div className="mt-0.5 text-emerald-600">
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 fill-emerald-100" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          isChecked
                            ? 'text-emerald-950'
                            : 'text-[#0A1931]'
                        }`}
                      >
                        {doc.name}
                      </span>
                      {doc.isMandatory ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          Required
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                          Bonus
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#717784] mt-0.5">
                      {doc.description}
                    </p>
                  </div>
                </div>
              );
            })}

            {!isReady && (
              <div className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Avoid Interview Rejection:</strong> Frontline candidates without original ID and bank passbook are typically turned away at the company security gate.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-[#717784] pb-1">
              Common questions supervisors ask during trial calls and practical walk-ins:
            </div>

            {guide.questions.map((q, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl border border-[#e6e8ec] bg-[#F8FAFC] space-y-2"
              >
                <h4 className="text-xs sm:text-sm font-bold text-[#0A1931]">
                  {q.question}
                </h4>
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-xs text-[#0f2f63]">
                  <span className="font-semibold">💡 What HR wants to hear:</span> {q.practicalTip}
                </div>
                <div className="text-xs text-[#717784] pl-1">
                  <span className="font-semibold text-[#0A1931]">
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
