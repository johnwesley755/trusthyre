// Browser Native Web Speech Synthesis Utility for Frontline Job Briefings ($0 API cost)
export interface AudioBriefingJob {
  title: string;
  companyName?: string;
  city?: string;
  location?: string;
  budget?: number | string | null;
  perks?: string[];
  allowDirectCall?: boolean;
}

class AudioBriefingService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeakingState = false;
  private listeners: Set<(isSpeaking: boolean) => void> = new Set();

  public subscribe(callback: (isSpeaking: boolean) => void): () => void {
    this.listeners.add(callback);
    callback(this.isSpeakingState);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(isSpeaking: boolean) {
    this.isSpeakingState = isSpeaking;
    this.listeners.forEach((cb) => cb(isSpeaking));
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.notify(false);
    }
  }

  public playJobBriefing(job: AudioBriefingJob, language: string = 'en') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis is not supported on this browser.');
      return;
    }

    this.stop();

    const title = job.title;
    const company = job.companyName || 'Verified Employer';
    const location = job.location || job.city || 'local area';
    const budgetNum = Number(job.budget);
    const dailyWage = budgetNum > 0 ? Math.round(budgetNum / 26) : null;

    let text = '';

    if (language === 'ta') {
      // Tamil briefing
      text = `வேலை அறிவிப்பு: ${title}. நிறுவனம்: ${company}, இடம்: ${location}. `;
      if (budgetNum > 0) {
        text += `மாத சம்பளம்: ரூபாய் ${budgetNum.toLocaleString('en-IN')}. ஒரு நாளைக்கு சுமார் ரூபாய் ${dailyWage}. `;
      }
      if (job.perks && job.perks.length > 0) {
        text += `கூடுதல் வசதிகள்: ${job.perks.slice(0, 2).join(', ')}. `;
      }
      text += `நேரடியாக விண்ணப்பிக்கலாம் அல்லது எச் ஆர் ஐ தொடர்பு கொள்ளலாம்.`;
    } else if (language === 'hi') {
      // Hindi briefing
      text = `नौकरी का अवसर: ${title}. कंपनी: ${company}, स्थान: ${location}. `;
      if (budgetNum > 0) {
        text += `मासिक वेतन: ₹${budgetNum.toLocaleString('en-IN')}. प्रतिदिन लगभग ₹${dailyWage}. `;
      }
      if (job.perks && job.perks.length > 0) {
        text += `सुविधाएं: ${job.perks.slice(0, 2).join(', ')}. `;
      }
      text += `सीधे कॉल करें या आवेदन करें।`;
    } else {
      // Default English briefing
      text = `Job opening: ${title} at ${company}, located in ${location}. `;
      if (budgetNum > 0) {
        text += `Salary: ₹${budgetNum.toLocaleString('en-IN')} per month, approximately ₹${dailyWage} per day. `;
      }
      if (job.perks && job.perks.length > 0) {
        text += `Key benefits: ${job.perks.slice(0, 2).join(', ')}. `;
      }
      text += `Direct call to HR and instant walk-in available on TrustHyre.`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    // Set voice according to language preference if available
    const voices = window.speechSynthesis.getVoices();
    if (language === 'ta') {
      const tamilVoice = voices.find((v) => v.lang.startsWith('ta'));
      if (tamilVoice) utterance.voice = tamilVoice;
      utterance.lang = 'ta-IN';
    } else if (language === 'hi') {
      const hindiVoice = voices.find((v) => v.lang.startsWith('hi'));
      if (hindiVoice) utterance.voice = hindiVoice;
      utterance.lang = 'hi-IN';
    } else {
      const indianVoice = voices.find((v) => v.lang === 'en-IN' || v.lang.startsWith('en'));
      if (indianVoice) utterance.voice = indianVoice;
      utterance.lang = 'en-IN';
    }

    utterance.rate = 0.95; // Slightly slower for crisp clarity
    utterance.pitch = 1.0;

    utterance.onstart = () => this.notify(true);
    utterance.onend = () => this.notify(false);
    utterance.onerror = () => this.notify(false);

    window.speechSynthesis.speak(utterance);
  }
}

export const audioBriefing = new AudioBriefingService();

