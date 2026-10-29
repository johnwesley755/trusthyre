import { useQuery } from '@tanstack/react-query';
import { skillTestService } from '../../../services/skill-test.service';
import type { SkillTest } from '../../../services/skill-test.service';
import { Clock, Trophy, ChevronRight, ChevronLeft, Award } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SkillTestUI } from '../components/SkillTestUI';
import { AppLoader } from '../../../components/common/AppLoader';

export interface TestSubmission {
  testId: string;
  userId: string;
  answers: unknown[];
  maxPoints: number;
}

export const SkillTestsPage = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [activeTest, setActiveTest] = useState<SkillTest | null>(null);

  const { data: tests, isLoading } = useQuery({
    queryKey: ['availableTests', selectedCategory],
    queryFn: () => skillTestService.getAvailableTests(selectedCategory)
  });

  if (activeTest) {
    return (
      <SkillTestUI 
        testId={activeTest.id}
        onClose={() => setActiveTest(null)}
        onComplete={() => {
          setActiveTest(null);
        }}
      />
    );
  }

  const categories = ['All', 'Electrical', 'Plumbing', 'Logistics', 'Cooking', 'Security'];

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white font-['Onest',system-ui,sans-serif] text-[#0a0a0a]">
      <main className="max-w-6xl mx-auto space-y-6 pb-20">
        
        {/* Navigation Bar */}
        <div className="pt-2">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f4f4f4] hover:bg-[#e6e8ec] text-[#0a0a0a] text-xs font-medium transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to Profile</span>
          </button>
        </div>

        {/* 1. Header Hero Card */}
        <div className="bg-[#f4f4f4] rounded-[2rem] p-6 sm:p-8 border border-[#e6e8ec]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#0f2f63]" />
                <span className="text-[10px] font-semibold uppercase text-[#0f2f63]">
                  Technical Skill Assessments
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0a0a0a]">
                Trade Certification Tests
              </h1>
              <p className="text-xs text-[#717784] font-medium leading-relaxed max-w-xl">
                Take verified trade skill assessments to earn certification badges and increase your profile level for premium contracts.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => {
            const isSelected = (selectedCategory === cat || (cat === 'All' && !selectedCategory));
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === 'All' ? undefined : cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#0f2f63] text-white shadow-xs'
                    : 'bg-white text-[#717784] hover:text-[#0a0a0a] hover:bg-[#f4f4f4] border border-[#e6e8ec]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* 3. Available Assessments Feed */}
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <AppLoader variant="page" message="Loading technical skill assessments..." />
          </div>
        ) : !tests || tests.length === 0 ? (
          <div className="bg-[#f4f4f4] rounded-[1.75rem] p-10 border border-[#e6e8ec] text-center space-y-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-[#717784] border border-[#e6e8ec]">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0a0a0a]">No Tests Available</h3>
            <p className="text-xs text-[#717784] max-w-sm mx-auto">
              No skill assessments currently scheduled for this trade category. Please check back soon or try another category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tests.map(test => {
              const difficultyBadgeClass = 
                test.difficulty === 'Advanced' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                test.difficulty === 'Intermediate' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-emerald-50 text-emerald-700 border-emerald-200';

              return (
                <div
                  key={test.id}
                  onClick={() => setActiveTest(test)}
                  className="bg-white rounded-2xl p-5 border border-[#e6e8ec] hover:border-[#0f2f63]/40 shadow-2xs hover:shadow-sm transition-all group cursor-pointer flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-[#0a0a0a] group-hover:text-[#0f2f63] transition-colors">
                        {test.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${difficultyBadgeClass}`}>
                        {test.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#717784]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#0f2f63]" />
                        <span className="tabular-nums font-medium">{test.durationMinutes} min</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-[#0a0a0a] font-semibold">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span className="tabular-nums">+{test.points} PTS</span>
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#e6e8ec] flex items-center justify-between text-xs font-semibold text-[#0f2f63]">
                    <span>Start Assessment</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
};
