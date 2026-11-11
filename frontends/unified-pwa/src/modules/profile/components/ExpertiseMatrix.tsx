import React from 'react';
import { motion } from 'framer-motion';

interface ExpertiseMatrixProps {
  skills: string | string[];
}

export const ExpertiseMatrix: React.FC<ExpertiseMatrixProps> = ({ skills }) => {
  const skillList = Array.isArray(skills)
    ? skills.map(s => String(s).trim()).filter(Boolean)
    : (typeof skills === 'string' ? skills.split(',').map(s => s.trim()).filter(Boolean) : []);

  return (
    <section className="bg-[#e2e8f0] rounded-[2rem] p-8 lg:p-10 shadow-inner relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-32 h-32 bg-[#FACD15] opacity-[0.05] rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <h3 className="text-xl font-black text-[#0A1931] dark:text-white">Expertise Matrix</h3>
        <span className="text-[10px] font-black text-[#FACD15] bg-[#0A1931] px-3 py-1 rounded-full">{skillList.length} Active Modules</span>
      </div>

      <div className="flex flex-wrap gap-3.5 relative z-10">
        {skillList.length > 0 ? (
          skillList.map((skill, i) => (
            <motion.div 
              key={skill}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="px-6 py-4 bg-white text-[#0A1931] dark:text-white rounded-2xl text-xs font-black border border-[#0A1931]/5 shadow-sm hover:border-[#FACD15] transition-all hover:shadow-2xl cursor-default flex flex-col gap-3 group/skill relative overflow-hidden"
            >
              <div className="flex items-center gap-2 break-words overflow-hidden">
                <div className="w-1.5 h-1.5 bg-[#FACD15] rounded-full group-hover/skill:scale-150 transition-transform shrink-0" />
                {skill}
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-black text-[#0A1931] dark:text-white/40 uppercase tracking-widest">
                <div className="bg-[#FACD15] text-[#0A1931] dark:text-white p-0.5 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-[10px] font-black">check</span>
                </div>
                Verified
              </div>
              <div className="absolute top-0 right-0 w-12 h-12 bg-[#FACD15] opacity-[0.03] rounded-bl-full group-hover/skill:opacity-[0.1] transition-opacity" />
            </motion.div>
          ))
        ) : (
          <p className="text-sm font-bold text-[#0A1931] dark:text-white/40 italic py-4">No skills registered in your profile.</p>
        )}
      </div>

    </section>
  );
};
