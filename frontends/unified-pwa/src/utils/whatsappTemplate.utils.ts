/**
 * WhatsApp Growth Engine - High-Conversion Template Utilities
 * Formats rich, bilingual (English/Tamil/Hindi) WhatsApp cards for Indian blue-collar hiring
 */

export interface WhatsAppJobData {
  id?: string;
  title: string;
  companyName?: string;
  city?: string;
  location?: string;
  address?: string;
  budget?: number | string | null;
  experienceYearsRequired?: number | null;
  skills?: string | string[];
  industry?: string;
}

/**
 * Builds high-converting WhatsApp message for job seekers and worker community forwards
 */
export function buildJobWhatsAppMessage(
  job: WhatsAppJobData,
  language: string = 'en',
  originUrl: string = typeof window !== 'undefined' ? window.location.origin : 'https://trusthyre.com'
): string {
  const salaryText = job.budget && Number(job.budget) > 0
    ? `₹${Number(job.budget).toLocaleString('en-IN')} / month`
    : 'Best in Industry / சந்தை முன்னணி சம்பளம்';

  const city = job.city || job.location || 'India';
  const company = job.companyName || 'Verified Enterprise';
  const experience = (job.experienceYearsRequired !== null && job.experienceYearsRequired !== undefined && job.experienceYearsRequired > 0)
    ? `${job.experienceYearsRequired}+ Years Experience`
    : 'Freshers & Experienced Welcome';

  const skillsList = Array.isArray(job.skills)
    ? job.skills.slice(0, 3).join(', ')
    : typeof job.skills === 'string' && job.skills.length > 0
      ? job.skills.split(',').slice(0, 3).map((s) => s.trim()).join(', ')
      : 'Trade Skills';

  const shareUrl = `${originUrl}/job/${job.id}?utm_source=whatsapp&utm_medium=viral_share`;

  if (language === 'ta') {
    return `🔥 *உடனடி வேலைவாய்ப்பு (Urgent Opening)*
━━━━━━━━━━━━━━━━━━━━━
💼 *வேலை / Role:* ${job.title}
🏢 *நிறுவனம் / Company:* ${company}
💰 *மாதச் சம்பளம் / Salary:* ${salaryText}
📍 *பணிபுரியும் இடம் / City:* ${city}
🛠️ *திறன்கள் / Skills:* ${skillsList}
⏳ *அனுபவம் / Exp:* ${experience}

🛡️ *நேரடி வேலை · இடைத்தரகர் கமிஷன் கிடையாது! (Zero Brokerage)*
✅ சரிபார்க்கப்பட்ட வேலைவாய்ப்பு (Verified Job)

👉 *உடனே விண்ணப்பிக்க (Apply Now):*
${shareUrl}
━━━━━━━━━━━━━━━━━━━━━
📢 _உங்கள் நண்பர்கள் மற்றும் வாட்ஸ்அப் குழுக்களில் பகிருங்கள்!_`;
  }

  if (language === 'hi') {
    return `🔥 *तत्काल नौकरी आवश्यकता (Urgent Job Opening)*
━━━━━━━━━━━━━━━━━━━━━
💼 *पद / Role:* ${job.title}
🏢 *कंपनी / Company:* ${company}
💰 *वेतन / Salary:* ${salaryText}
📍 *स्थान / Location:* ${city}
🛠️ *कौशल / Skills:* ${skillsList}
⏳ *अनुभव / Experience:* ${experience}

🛡️ *सीधी भर्ती · कोई दलाली नहीं! (Zero Brokerage)*
✅ TrustHyre द्वारा सत्यापित नियोक्ता

👉 *यहाँ आवेदन करें (Apply Now):*
${shareUrl}
━━━━━━━━━━━━━━━━━━━━━
📢 _जरूरतमंद साथियों और व्हाट्सएप ग्रुपों में शेयर करें!_`;
  }

  // Default English (with Tamil sub-headers for regional virality)
  return `🔥 *URGENT JOB OPENING / உடனடி வேலைவாய்ப்பு*
━━━━━━━━━━━━━━━━━━━━━
💼 *Role / வேலை:* ${job.title}
🏢 *Company:* ${company}
💰 *Salary / சம்பளம்:* ${salaryText}
📍 *Location / இடம்:* ${city}
🛠️ *Required Skills:* ${skillsList}
⏳ *Experience:* ${experience}

🛡️ *Direct Hiring · Zero Brokerage (நேரடி வேலை - கமிஷன் இல்லை)*
✅ 100% Verified Employer on TrustHyre

👉 *Apply Directly in 1-Click:*
${shareUrl}
━━━━━━━━━━━━━━━━━━━━━
📢 _Forward this to friends looking for verified jobs in ${city}!_`;
}

/**
 * Builds employer broadcast message for broadcasting new job openings to local worker circles & contractor groups
 */
export function buildEmployerBroadcastMessage(
  job: WhatsAppJobData,
  originUrl: string = typeof window !== 'undefined' ? window.location.origin : 'https://trusthyre.com'
): string {
  const salaryText = job.budget && Number(job.budget) > 0
    ? `₹${Number(job.budget).toLocaleString('en-IN')}/month`
    : 'Competitive Pay';

  const city = job.city || job.location || 'India';
  const company = job.companyName || 'Our Company';
  const shareUrl = `${originUrl}/job/${job.id}?utm_source=whatsapp&utm_medium=employer_broadcast`;

  return `📢 *WE ARE HIRING / வேலைக்கு ஆட்கள் தேவை!*
━━━━━━━━━━━━━━━━━━━━━
We are urgently looking for verified candidates to join *${company}* in *${city}*:

💼 *Opening:* ${job.title}
💰 *Monthly Pay:* ${salaryText}
📍 *Worksite:* ${city}
✅ *Direct Company Opening · Immediate Joining*

Interested candidates or candidates looking for work can apply directly via TrustHyre here:
👉 ${shareUrl}

Please share with qualified workers in your network! 🙏`;
}

/**
 * Cleans phone number for WhatsApp deep link (strips non-digits, prefixes India country code 91 if 10-digit)
 */
export function formatWhatsAppPhoneNumber(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
}

/**
 * Builds worker application message sent directly to employer WhatsApp chat
 */
export function buildWorkerToEmployerApplicationMessage(
  job: WhatsAppJobData,
  candidate: {
    name: string;
    phone?: string;
    trade?: string;
    experienceYears?: number | string;
    city?: string;
    profileUrl?: string;
  },
  language: string = 'en'
): string {
  const salaryText = job.budget && Number(job.budget) > 0
    ? `₹${Number(job.budget).toLocaleString('en-IN')}/mo`
    : 'Best in Industry';

  const expText = candidate.experienceYears && Number(candidate.experienceYears) > 0
    ? `${candidate.experienceYears} Years`
    : 'Fresher';

  if (language === 'ta') {
    return `வணக்கம்! TrustHyre இல் உங்கள் வேலைவாய்ப்பு விளம்பரத்தைப் பார்த்தேன்:
*${job.title}* (${job.city || 'Worksite'}) - ${salaryText}

👤 *விண்ணப்பதாரர் / Name:* ${candidate.name}
🛠️ *திறன் / Trade:* ${candidate.trade || job.industry || 'Skilled Worker'}
⏳ *அனுபவம் / Exp:* ${expText}
📍 *வசிப்பிடம் / Location:* ${candidate.city || 'Nearby'}
${candidate.profileUrl ? `📄 *சரிபார்க்கப்பட்ட சுயவிவரம் (Profile):* ${candidate.profileUrl}\n` : ''}
நான் உடனடியாக பணியில் சேர தயாராக உள்ளேன். தயவுசெய்து வேலை விவரங்களை தெரிவிக்கவும்!`;
  }

  return `Hello! I saw your job opening on TrustHyre:
*${job.title}* in *${job.city || 'Worksite'}* (${salaryText})

👤 *Candidate Name:* ${candidate.name}
🛠️ *Trade / Skill:* ${candidate.trade || job.industry || 'Skilled Worker'}
⏳ *Experience:* ${expText}
📍 *Current City:* ${candidate.city || 'Nearby'}
${candidate.profileUrl ? `📄 *Verified Profile Link:* ${candidate.profileUrl}\n` : ''}
I am interested and available to join immediately. Please let me know the worksite address and interview timing!`;
}

/**
 * Builds employer outreach message sent directly to a worker on WhatsApp
 */
export function buildEmployerToWorkerOutreachMessage(
  worker: {
    name: string;
    trade?: string;
    city?: string;
  },
  employer: {
    companyName?: string;
    jobTitle?: string;
    budget?: number | string | null;
    city?: string;
    jobId?: string;
  },
  originUrl: string = typeof window !== 'undefined' ? window.location.origin : 'https://trusthyre.com'
): string {
  const company = employer.companyName || 'Verified Employer';
  const role = employer.jobTitle || 'Immediate Opening';
  const salaryText = employer.budget && Number(employer.budget) > 0
    ? `₹${Number(employer.budget).toLocaleString('en-IN')}/month`
    : 'Attractive Pay';
  const location = employer.city || worker.city || 'your area';

  return `Hello ${worker.name}! 👋
We reviewed your verified profile on TrustHyre and have an immediate opening for you at *${company}*:

💼 *Position:* ${role}
💰 *Pay / Salary:* ${salaryText}
📍 *Worksite:* ${location}

${employer.jobId ? `👉 *Review Opening Details:* ${originUrl}/job/${employer.jobId}\n` : ''}
Are you currently available to discuss this opportunity? Please reply here on WhatsApp!`;
}

/**
 * Builds viral worker skill badge message for WhatsApp status & peer referral
 */
export function buildWorkerSkillBadgeShareMessage(
  worker: {
    id: string;
    name: string;
    skills?: string | string[];
    city?: string;
    trustScore?: number;
    level?: string;
  },
  originUrl: string = typeof window !== 'undefined' ? window.location.origin : 'https://trusthyre.com'
): string {
  const profileUrl = `${originUrl}/worker/${worker.id}?utm_source=whatsapp&utm_medium=skill_badge`;
  const skills = Array.isArray(worker.skills)
    ? worker.skills.slice(0, 3).join(', ')
    : worker.skills || 'Verified Trade Skills';

  return `🛡️ *TRUSTHYRE VERIFIED SKILLED WORKER*
━━━━━━━━━━━━━━━━━━━━━
👤 *Name:* ${worker.name}
🛠️ *Verified Skills:* ${skills}
📍 *Available in:* ${worker.city || 'Tamil Nadu / Pan India'}
🏅 *Certification Level:* ${worker.level || 'L1 Verified'}
${worker.trustScore ? `⭐ *Trust Score:* ${worker.trustScore}/100\n` : ''}
Need verified workers with zero agency brokerage? View full profile and hire directly:
👉 ${profileUrl}`;
}

/**
 * Opens WhatsApp direct chat with a phone number and pre-filled message
 */
export function openWhatsAppDirectChat(phoneNumber: string, text: string): void {
  const cleanPhone = formatWhatsAppPhoneNumber(phoneNumber);
  const encoded = encodeURIComponent(text);
  const rawUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
  
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'https:' && (parsed.hostname === 'wa.me' || parsed.hostname === 'api.whatsapp.com')) {
      window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
      return;
    }
  } catch (_) {}
  window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
}

/**
 * Opens WhatsApp with preformatted text across web & mobile devices
 */
export function openWhatsAppShare(text: string): void {
  const encoded = encodeURIComponent(text);
  const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
  try {
    const parsed = new URL(waUrl);
    if (parsed.protocol === 'https:' && (parsed.hostname === 'api.whatsapp.com' || parsed.hostname === 'wa.me')) {
      window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
      return;
    }
  } catch (_) {}
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

