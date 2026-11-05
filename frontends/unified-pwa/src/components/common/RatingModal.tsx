import React, { useState } from 'react';
import { Star, X, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ratingService } from '../../services/rating.service';
import { toast } from 'sonner';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  rateeId: string;
  rateeName: string;
  rateeRole: 'worker' | 'employer';
  jobTitle?: string;
  onSuccess?: () => void;
}

const WORKER_TAGS = [
  'Punctual & Reliable',
  'High Quality Work',
  'Quick Learner',
  'Great Communication',
  'Followed Safety Rules',
  'Hard Worker'
];

const EMPLOYER_TAGS = [
  'Clear Instructions',
  'On-Time Payment',
  'Safe Workplace',
  'Supportive Team',
  'Accurate Job Scope'
];

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  jobId,
  rateeId,
  rateeName,
  rateeRole,
  jobTitle,
  onSuccess
}) => {
  const [score, setScore] = useState<number>(5);
  const [hoverScore, setHoverScore] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const tags = rateeRole === 'worker' ? WORKER_TAGS : EMPLOYER_TAGS;

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getScoreDescription = (s: number) => {
    switch (s) {
      case 5: return 'Exceptional — Exceeded expectations';
      case 4: return 'Very Good — Reliable & professional';
      case 3: return 'Satisfactory — Met expectations';
      case 2: return 'Needs Improvement — Below standard';
      case 1: return 'Unsatisfactory — Significant issues';
      default: return 'Select your star rating';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (score < 1 || score > 5) {
      toast.error('Please select a star rating from 1 to 5.');
      return;
    }

    try {
      setIsSubmitting(true);

      const finalComment = selectedTags.length > 0
        ? `${selectedTags.join(', ')}. ${comment}`.trim()
        : comment.trim();

      await ratingService.submitRating({
        jobId,
        rateeId,
        score,
        comment: finalComment
      });

      toast.success(
        rateeRole === 'worker'
          ? `Verified rating recorded for ${rateeName}! Trust score updated.`
          : `Review submitted for ${rateeName}!`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to submit rating.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs font-['Onest',system-ui,sans-serif]"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) onClose();
        }}
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl sm:rounded-3xl border border-[#e6e8ec] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e6e8ec] bg-white shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#0f2f63]/10 border border-[#0f2f63]/15 text-[#0f2f63] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a] truncate tracking-tight">
                  {rateeRole === 'worker' ? 'Rate Verified Worker' : 'Rate Employer Experience'}
                </h3>
                <p className="text-[11px] text-[#717784] truncate">
                  {jobTitle ? `${jobTitle} • ` : ''}{rateeName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 ml-2 cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form and Scrollable Body */}
          <form 
            id="rating-modal-form"
            onSubmit={handleSubmit} 
            className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed text-[#717784] overscroll-contain"
          >
            {/* Star Selector */}
            <div className="bg-[#f8f9fa] rounded-2xl p-4 border border-[#e6e8ec] text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setScore(star)}
                    onMouseEnter={() => setHoverScore(star)}
                    onMouseLeave={() => setHoverScore(0)}
                    className="p-1 hover:scale-110 active:scale-95 transition-transform cursor-pointer focus:outline-none"
                  >
                    <Star
                      className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                        star <= (hoverScore || score)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-[#0a0a0a] min-h-[1.2rem]">
                {getScoreDescription(hoverScore || score)}
              </p>
            </div>

            {/* Quick Feedback Tags */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#717784] block">
                Key Strengths & Feedback
              </label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#0f2f63] text-white shadow-xs'
                          : 'bg-[#f8f9fa] text-slate-700 border border-[#e6e8ec] hover:border-[#0f2f63]/40 hover:bg-slate-100'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Written Review */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#717784]">
                  Detailed Review (Optional)
                </label>
                <span className="text-[10px] text-slate-400">
                  {comment.length}/500
                </span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 500))}
                rows={3}
                placeholder={
                  rateeRole === 'worker'
                    ? 'Describe punctuality, quality of work, and performance on the job...'
                    : 'Describe work instructions, safety environment, and payment timeliness...'
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#e6e8ec] focus:outline-none focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] placeholder:text-slate-400 resize-none text-[#0a0a0a] bg-white transition-all"
              />
            </div>

            {/* Trust & Safety Banner */}
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#0f2f63] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#0a0a0a] leading-relaxed">
                <strong className="font-bold">TrustHyre Verified Rating:</strong> Only confirmed participants of accepted shifts can leave ratings. This review will reflect in the member's verified trust profile.
              </p>
            </div>
          </form>

          {/* Modal Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-[#e6e8ec] bg-white flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold uppercase text-slate-600 hover:text-[#0a0a0a] hover:bg-slate-100 rounded-full transition-colors cursor-pointer border border-[#e6e8ec]"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="rating-modal-form"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold uppercase text-white bg-[#0f2f63] hover:bg-[#2563c9] rounded-full transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Review</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
