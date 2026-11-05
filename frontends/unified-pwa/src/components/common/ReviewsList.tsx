import React from 'react';
import { Star, ShieldCheck, CheckCircle, MessageSquare } from 'lucide-react';
import type { Rating } from '../../types';

interface ReviewsListProps {
  ratings: Rating[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
}

export const ReviewsList: React.FC<ReviewsListProps> = ({
  ratings = [],
  isLoading = false,
  emptyTitle = 'No verified reviews yet',
  emptySubtitle = 'Completed jobs and verified interaction feedback will appear here.'
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse py-4">
        <div className="h-20 bg-slate-100 rounded-2xl w-full" />
        <div className="h-24 bg-slate-100 rounded-2xl w-full" />
        <div className="h-24 bg-slate-100 rounded-2xl w-full" />
      </div>
    );
  }

  const totalReviews = ratings.length;
  const avgScore = totalReviews > 0
    ? ratings.reduce((sum, r) => sum + (r.score || 0), 0) / totalReviews
    : 0;

  // Star breakdown calculation
  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  ratings.forEach(r => {
    const s = Math.round(r.score || 5);
    if (distribution[s] !== undefined) distribution[s]++;
  });

  return (
    <div className="space-y-6">
      {/* Aggregate Score Card */}
      {totalReviews > 0 ? (
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-3xl p-6 border border-slate-200/60 shadow-sm flex flex-col md:flex-row items-center gap-6">
          <div className="text-center md:text-left shrink-0 md:pr-6 md:border-r border-slate-200">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-4xl font-extrabold text-[#0A1931]">
                {avgScore.toFixed(1)}
              </span>
              <div className="space-y-0.5">
                <div className="flex text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= Math.round(avgScore) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[11px] font-medium text-slate-500">
                  out of 5.0 stars
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2 flex items-center justify-center md:justify-start gap-1 font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#0066FF]" />
              {totalReviews} Verified Review{totalReviews === 1 ? '' : 's'}
            </p>
          </div>

          {/* Star Distribution Progress Bars */}
          <div className="flex-1 w-full space-y-1.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = distribution[stars] || 0;
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-2 text-xs">
                  <span className="w-7 font-bold text-slate-600 text-right">{stars}★</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-[11px] font-medium text-slate-400 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Review Cards List */}
      {totalReviews === 0 ? (
        <div className="text-center py-10 px-4 bg-slate-50/60 rounded-3xl border border-dashed border-slate-200">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#0A1931]">{emptyTitle}</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {emptySubtitle}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {ratings.map((rating) => {
            const dateStr = rating.createdAt
              ? new Date(rating.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'Verified Shift';

            return (
              <div
                key={rating.id}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 overflow-hidden border border-slate-200">
                      {rating.reviewerAvatar ? (
                        <img
                          src={rating.reviewerAvatar}
                          alt={rating.reviewerName || 'Reviewer'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (rating.reviewerName || 'V').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#0A1931]">
                          {rating.reviewerName || 'Verified Employer / Worker'}
                        </span>
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-2.5 h-2.5" />
                          Verified
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {rating.jobTitle ? `${rating.jobTitle} • ` : ''}{dateStr}
                      </p>
                    </div>
                  </div>

                  {/* Rating Stars badge */}
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold">{Number(rating.score).toFixed(1)}</span>
                  </div>
                </div>

                {rating.comment ? (
                  <p className="text-xs text-slate-700 leading-relaxed pl-13">
                    {rating.comment}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

