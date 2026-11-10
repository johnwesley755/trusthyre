import React, { useState } from 'react';
import { IndianRupee, Clock3, Utensils, Home, Zap, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getWageBenchmark, TRADE_WAGE_BENCHMARKS } from '../../constants/tradeWageBenchmarks';
import { BaseModal } from './BaseModal';
import { Dropdown } from '../ui/dropdown';

interface WageBenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTrade?: string;
  currentCity?: string;
  onSelectBenchmarkFilter?: (trade: string, minBudget: number) => void;
}

export const WageBenchmarkModal: React.FC<WageBenchmarkModalProps> = ({
  isOpen,
  onClose,
  defaultTrade,
  currentCity,
  onSelectBenchmarkFilter
}) => {
  const navigate = useNavigate();

  // Selected trade key for benchmark
  const [selectedTradeName, setSelectedTradeName] = useState<string>(() => {
    return defaultTrade || 'Electrician';
  });

  // Interactive wage simulator sliders
  const [overtimeHoursPerDay, setOvertimeHoursPerDay] = useState<number>(2);
  const [includesFreeFood, setIncludesFreeFood] = useState<boolean>(true);
  const [includesFreeRoom, setIncludesFreeRoom] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentBenchmark = getWageBenchmark(selectedTradeName);

  // Take-home cash calculation per month (assuming 26 working days standard)
  const baseSalary = currentBenchmark.avgMonthly;
  const overtimeMonthly = overtimeHoursPerDay * currentBenchmark.overtimeHourly * 26;
  const foodSavings = includesFreeFood ? currentBenchmark.foodAllowanceMonthly : 0;
  const roomSavings = includesFreeRoom ? currentBenchmark.roomAllowanceMonthly : 0;
  const totalMonthlyEarningsPotential = baseSalary + overtimeMonthly + foodSavings + roomSavings;
  const dailyCashFlowEquivalent = Math.round(totalMonthlyEarningsPotential / 26);

  const handleViewMatchingJobs = () => {
    onClose();
    if (onSelectBenchmarkFilter) {
      onSelectBenchmarkFilter(currentBenchmark.trade, currentBenchmark.avgMonthly);
    } else {
      const cityQuery = currentCity && currentCity !== 'All' ? `&city=${encodeURIComponent(currentCity)}` : '';
      navigate(`/jobs?q=${encodeURIComponent(currentBenchmark.trade)}${cityQuery}`);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Trade Wage & Earnings Benchmark"
      subtitle={`Real market take-home rates in ${currentCity || 'Chennai'}`}
      icon={<IndianRupee className="w-5 h-5 text-[#10b981]" />}
      iconBgColor="bg-emerald-50 text-emerald-700 border border-emerald-200"
      maxWidth="lg"
      bodyClassName="p-0 flex flex-col bg-white"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#717784] font-medium">
            * Zero agent cuts or illegal deductions on TrustHyre
          </div>
          <button
            type="button"
            onClick={handleViewMatchingJobs}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider bg-[#0f2f63] hover:bg-[#0066ff] active:bg-[#003d99] text-white shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-95"
          >
            <span>View Jobs Paying &ge; ₹{currentBenchmark.avgMonthly.toLocaleString('en-IN')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      }
    >
      <div className="p-4 sm:p-5 space-y-4 max-h-[65vh] overflow-y-auto">
        {/* 1. Trade Selector Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#717784] block">
            Select Frontline Trade:
          </label>
          <Dropdown
            value={selectedTradeName}
            onChange={(val) => setSelectedTradeName(val)}
            searchable
            options={TRADE_WAGE_BENCHMARKS.map((b) => ({
              value: b.trade,
              label: b.trade,
              sublabel: `Avg: ₹${b.avgMonthly.toLocaleString('en-IN')}/mo`,
            }))}
            className="w-full"
          />
        </div>

        {/* 2. Official Market Range 3-Tier Grid */}
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#e6e8ec] flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-[#717784] block">Entry Level</span>
            <span className="text-xs sm:text-sm font-bold text-[#0A1931] mt-0.5 block">
              ₹{currentBenchmark.minMonthly.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-[#717784]">/month</span>
          </div>

          <div className="bg-[#eff6ff] p-3 pt-4 rounded-2xl border-2 border-[#0066ff] relative shadow-2xs flex flex-col justify-center">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-[#0066ff] text-white text-[9px] font-bold rounded-full uppercase tracking-wider whitespace-nowrap shadow-xs">
              Verified Average
            </span>
            <span className="text-[10px] uppercase font-bold text-[#0066ff] block">Market Median</span>
            <span className="text-sm sm:text-base font-extrabold text-[#0066ff] mt-0.5 block">
              ₹{currentBenchmark.avgMonthly.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-[#0066ff]/80 font-medium">/month</span>
          </div>

          <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#e6e8ec] flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-[#717784] block">Experienced</span>
            <span className="text-xs sm:text-sm font-bold text-[#0A1931] mt-0.5 block">
              ₹{currentBenchmark.maxMonthly.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-[#717784]">/month</span>
          </div>
        </div>

        {/* 3. Take-Home Cashflow Simulator Box */}
        <div className="bg-[#eff6ff]/60 border border-[#dbeafe] rounded-2xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0f2f63]">
              <Zap className="w-4 h-4 text-[#0066ff]" />
              <span>Overtime & Perks Simulator (Real In-Hand Value)</span>
            </div>
            <span className="text-[10px] font-bold bg-white text-[#0066ff] px-2 py-0.5 rounded-full border border-[#dbeafe]">
              Interactive
            </span>
          </div>

          {/* Overtime Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-[#0A1931]">
              <span className="flex items-center gap-1">
                <Clock3 className="w-3.5 h-3.5 text-[#0066ff]" />
                <span>Overtime (OT) Hours:</span>
              </span>
              <span className="font-bold text-[#0066ff]">
                {overtimeHoursPerDay} hrs/day (+₹{overtimeMonthly.toLocaleString('en-IN')}/mo)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              step="1"
              value={overtimeHoursPerDay}
              onChange={(e) => setOvertimeHoursPerDay(Number(e.target.value))}
              className="w-full accent-[#0066ff] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#717784]">
              <span>0 hrs (Standard 8h)</span>
              <span>1 hr</span>
              <span>2 hrs (Typical)</span>
              <span>3 hrs</span>
              <span>4 hrs (Max)</span>
            </div>
          </div>

          {/* Perks Toggles */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIncludesFreeFood(!includesFreeFood)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                includesFreeFood
                  ? 'bg-amber-100/70 border-amber-300 text-amber-950 shadow-2xs'
                  : 'bg-white border-[#e6e8ec] text-[#717784] hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-amber-700" />
                <span>Free Food</span>
              </span>
              <span className="text-[10px] font-bold">
                {includesFreeFood ? `+₹${currentBenchmark.foodAllowanceMonthly}` : 'No Food'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIncludesFreeRoom(!includesFreeRoom)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                includesFreeRoom
                  ? 'bg-indigo-100/70 border-indigo-300 text-indigo-950 shadow-2xs'
                  : 'bg-white border-[#e6e8ec] text-[#717784] hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-indigo-700" />
                <span>Free Room</span>
              </span>
              <span className="text-[10px] font-bold">
                {includesFreeRoom ? `+₹${currentBenchmark.roomAllowanceMonthly}` : 'No Room'}
              </span>
            </button>
          </div>

          {/* Estimated Total Monthly Take-Home */}
          <div className="bg-white p-3.5 rounded-xl border border-[#dbeafe] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#717784] block">
                Estimated Total In-Hand Value
              </span>
              <span className="text-xs text-[#717784]">
                Equivalent to ≈ ₹{dailyCashFlowEquivalent}/day
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg sm:text-xl font-extrabold text-[#10b981]">
                ₹{totalMonthlyEarningsPotential.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-[#717784] block">/month take-home</span>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
