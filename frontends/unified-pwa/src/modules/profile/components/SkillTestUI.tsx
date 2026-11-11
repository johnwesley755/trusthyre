import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, XCircle, AlertCircle, ChevronRight, Loader2, Trophy } from 'lucide-react';
import { skillTestService, type SkillTest, type TestResult } from '../../../services/skill-test.service';

interface SkillTestUIProps {
  testId: string;
  onClose: () => void;
  onComplete: () => void;
}

export const SkillTestUI: React.FC<SkillTestUIProps> = ({ testId, onClose, onComplete }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timer, setTimer] = useState<number | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);

  const { data: test, isLoading: isTestLoading, error: testError } = useQuery({
    queryKey: ['skillTest', testId],
    queryFn: async () => {
      const data = await skillTestService.getTestById(testId);
      setTimer(data.durationMinutes * 60);
      return data;
    },
    staleTime: Infinity,
  });

  const submitTestMutation = useMutation({
    mutationFn: (answersPayload: number[]) => skillTestService.submitTest(testId, answersPayload),
    onSuccess: (data) => {
      setResult(data);
    },
  });

  useEffect(() => {
    if (timer !== null && timer > 0 && !result && !submitTestMutation.isPending) {
      const interval = setInterval(() => setTimer(t => (t ? t - 1 : 0)), 1000);
      return () => clearInterval(interval);
    } else if (timer === 0 && test && !result && !submitTestMutation.isPending) {
      handleSubmit();
    }
  }, [timer, result, submitTestMutation.isPending, test]);

  const handleAnswer = (optionIdx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = optionIdx;
    setAnswers(newAnswers);
  };

  const questionsList = (test as any)?.questions || (test as any)?.skillTestQuestions || [];

  const handleNext = () => {
    if (test && currentIdx < questionsList.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handleSubmit = () => {
    if (!test) return;
    const finalAnswers = questionsList.map((_: any, i: number) => answers[i] ?? -1);
    submitTestMutation.mutate(finalAnswers);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (testError) {
    return (
      <div className="fixed inset-0 bg-brand-secondary/40 backdrop-blur-3xl z-[100] p-6 flex items-center justify-center">
        <div className="bg-white p-12 rounded-[3rem] text-center space-y-6 max-w-md shadow-2xl border border-brand-border">
          <AlertCircle className="w-20 h-20 text-rose-500 mx-auto" />
          <h2 className="text-3xl font-bold tracking-tighter text-brand-secondary">{testError.message}</h2>
          <button onClick={onClose} className="w-full bg-brand-secondary text-brand-primary py-4 rounded-2xl font-bold uppercase tracking-widest text-xs">Return to profile</button>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="fixed inset-0 bg-brand-secondary/40 backdrop-blur-3xl z-[100] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
      </div>
    );
  }

  if (result) {
    return (
      <div className="fixed inset-0 bg-brand-secondary/40 backdrop-blur-3xl z-[100] p-6 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full bg-white dark:bg-[#09090B] border border-brand-border dark:border-zinc-800 rounded-[3.5rem] p-16 text-center space-y-12 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-primary opacity-[0.05] rounded-bl-full pointer-events-none" />
          
          <div className="mx-auto w-28 h-28 bg-brand-secondary rounded-[2.5rem] flex items-center justify-center shadow-xl transform rotate-6 scale-110">
            {result.passed ? <Trophy className="h-14 w-14 text-brand-primary" /> : <XCircle className="h-14 w-14 text-rose-500" />}
          </div>
          
          <div className="space-y-4">
            <h2 className="text-5xl font-black tracking-tighter text-brand-secondary dark:text-white italic uppercase underline decoration-brand-primary decoration-8 underline-offset-8">
              {result.passed ? 'Certified Operative' : 'Integration Halted'}
            </h2>
            <p className="text-brand-muted font-bold text-xl uppercase tracking-widest leading-relaxed opacity-60">
              {result.feedback || (result.passed ? 'Assessment passed successfully!' : 'Assessment threshold not met.')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="bg-brand-bg dark:bg-[#121215] p-8 rounded-[2.5rem] border border-brand-border dark:border-zinc-800 shadow-inner">
              <span className="block text-[10px] font-black text-brand-muted/40 tracking-[0.2em] uppercase mb-3">Assessment Grade</span>
              <span className="text-5xl font-black text-brand-secondary dark:text-white tracking-tighter">{result.score}%</span>
            </div>
            <div className="bg-brand-secondary p-8 rounded-[2.5rem] border border-brand-secondary shadow-2xl shadow-brand-secondary/20">
              <span className="block text-[10px] font-black text-brand-primary/60 tracking-[0.2em] uppercase mb-3">Correct Entries</span>
              <span className="text-5xl font-black text-brand-primary tracking-tighter">
                {result.correctAnswers ?? Math.round((result.score / 100) * (result.totalQuestions || questionsList.length || 5))}/{result.totalQuestions || questionsList.length || 5}
              </span>
            </div>
          </div>

          <button 
            onClick={() => { onComplete(); onClose(); }}
            className="w-full bg-brand-secondary text-brand-primary py-6 rounded-[2rem] font-black text-xs tracking-[0.3em] uppercase hover:bg-neutral-800 transition-all active:scale-95 shadow-2xl shadow-brand-secondary/20"
          >
            Finalize profile update
          </button>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = questionsList[currentIdx];

  return (
    <div className="fixed inset-0 bg-brand-bg dark:bg-[#000000] z-[100] flex flex-col md:overflow-hidden text-[#0a0a0a] dark:text-white">
      {/* HUD Bar */}
      <header className="px-12 py-10 border-b border-brand-border dark:border-zinc-800 bg-white/80 dark:bg-[#000000]/80 backdrop-blur-3xl flex justify-between items-center shrink-0">
        <div className="space-y-1">
          <h1 className="text-xs font-black tracking-[0.3em] text-brand-muted/40 uppercase">Assessment sequence</h1>
          <h2 className="text-2xl font-black tracking-tighter text-brand-secondary dark:text-white uppercase italic">{test.title}</h2>
        </div>
        <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl border ${(timer || 0) < 60 ? 'bg-rose-500 text-white border-rose-600 animate-pulse' : 'bg-brand-secondary text-brand-primary border-brand-secondary'} shadow-xl transition-colors duration-500`}>
          <Clock className="w-5 h-5" />
          <span className="text-xl font-black tracking-tight font-mono">{formatTime(timer || 0)}</span>
        </div>
      </header>

      {/* Progress Line */}
      <div className="h-2 w-full bg-brand-border dark:bg-zinc-800 shrink-0">
        <motion.div 
          className="h-full bg-brand-primary shadow-[0_0_20px_rgba(250,204,21,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIdx + 1) / (questionsList.length || 1)) * 100}%` }}
        />
      </div>

      <main className="flex-1 overflow-y-auto p-12 md:p-24 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div 
              key={currentIdx}
              initial={{ opacity: 0, x: 50, rotate: 1 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, x: -50, rotate: -1 }}
              className="max-w-3xl w-full space-y-16"
            >
              <div className="space-y-6 text-center md:text-left">
                <span className="text-xs font-black text-brand-primary bg-brand-secondary px-4 py-1.5 rounded-full inline-block tracking-[0.2em] uppercase">Module {currentIdx + 1} of {questionsList.length}</span>
                <h3 className="text-4xl md:text-6xl font-black text-brand-secondary dark:text-white tracking-tighter leading-[0.9] lg:pr-20">
                  {currentQuestion.questionText}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {(currentQuestion.options || []).map((option: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    className={`p-8 rounded-[2.5rem] border-2 text-left transition-all relative group flex items-center gap-6 ${
                      answers[currentIdx] === i 
                        ? 'bg-brand-secondary border-brand-secondary text-brand-primary shadow-2xl transform scale-[1.02]' 
                        : 'bg-white dark:bg-[#121215] border-brand-border dark:border-zinc-800 text-brand-secondary dark:text-zinc-100 hover:border-brand-primary dark:hover:border-zinc-600 hover:shadow-xl'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg transition-colors ${
                      answers[currentIdx] === i ? 'bg-brand-primary text-brand-secondary' : 'bg-brand-bg dark:bg-zinc-800 text-brand-muted dark:text-zinc-400'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="text-xl font-bold tracking-tight">{option}</span>
                    {answers[currentIdx] === i && <CheckCircle2 className="w-8 h-8 absolute right-8 text-brand-primary" />}
                    <div className="absolute inset-0 bg-brand-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] pointer-events-none" />
                  </button>
                ))}
              </div>

              <div className="pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <button 
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx(prev => prev - 1)}
                  className="w-full md:w-auto px-10 py-4 text-[10px] font-black tracking-[0.3em] text-brand-muted/40 uppercase hover:text-brand-secondary disabled:opacity-0 transition-all"
                >
                  Previous sequence
                </button>
                
                {currentIdx < (questionsList.length || 1) - 1 ? (
                  <button 
                    disabled={answers[currentIdx] === undefined}
                    onClick={() => setCurrentIdx(prev => prev + 1)}
                    className="w-full md:w-auto bg-brand-secondary text-brand-primary px-16 py-6 rounded-[2rem] font-black text-xs tracking-[0.3em] uppercase shadow-2xl shadow-brand-secondary/20 hover:bg-neutral-800 disabled:opacity-20 transition-all flex items-center justify-center gap-3"
                  >
                    Next module <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button 
                    onClick={handleSubmit}
                    disabled={submitTestMutation.isPending || answers[currentIdx] === undefined}
                    className="w-full md:w-auto bg-brand-primary text-brand-secondary px-20 py-6 rounded-[2rem] font-black text-xs tracking-[0.3em] uppercase shadow-2xl shadow-brand-primary/40 hover:bg-yellow-400 disabled:opacity-20 transition-all flex items-center justify-center gap-3"
                  >
                    {submitTestMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Finalize certification'}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
