import crypto from 'node:crypto';

export type ScrapeStage =
  | 'URL_PARSE'
  | 'HTTP_FETCH'
  | 'BOT_DETECTION'
  | 'EXTRACTION_JSONLD'
  | 'EXTRACTION_META'
  | 'EXTRACTION_DOM'
  | 'DOMAIN_RESOLVE'
  | 'CONTACT_ENRICH'
  | 'DB_INGEST';

export type ScrapeStatus = 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';

export interface ScrapeStepLog {
  step: number;
  stage: ScrapeStage;
  title: string;
  status: ScrapeStatus;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  durationMs?: number;
}

export interface ScrapeSessionSummary {
  sessionId: string;
  targetUrl?: string;
  sourceType: string;
  startedAt: string;
  finishedAt?: string;
  totalDurationMs?: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  steps: ScrapeStepLog[];
  extractedEntity?: {
    companyName?: string;
    companyWebsite?: string;
    jobTitle?: string;
    city?: string;
    officialEmail?: string | null;
    officialPhone?: string | null;
    workersNeeded?: number;
    salaryRange?: string;
  };
  error?: string;
}

// In-memory circular buffer for the last 50 scraping sessions
const SESSION_HISTORY_LIMIT = 50;
const sessionHistory: ScrapeSessionSummary[] = [];

export class ScrapeDiagnosticsSession {
  public readonly sessionId: string;
  private readonly startTime: number;
  private stepCounter = 0;
  private summary: ScrapeSessionSummary;

  constructor(targetUrl?: string, sourceType: string = 'URL_CRAWL') {
    this.sessionId = `crawl_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    this.startTime = Date.now();
    this.summary = {
      sessionId: this.sessionId,
      targetUrl,
      sourceType,
      startedAt: new Date().toISOString(),
      status: 'IN_PROGRESS',
      steps: [],
    };
  }

  logStep(
    stage: ScrapeStage,
    title: string,
    status: ScrapeStatus,
    message: string,
    details?: Record<string, any>,
    stepDurationMs?: number
  ): ScrapeStepLog {
    this.stepCounter++;
    const stepLog: ScrapeStepLog = {
      step: this.stepCounter,
      stage,
      title,
      status,
      message,
      details,
      timestamp: new Date().toISOString(),
      durationMs: stepDurationMs,
    };

    this.summary.steps.push(stepLog);

    // Formatted terminal output for backend visibility
    const icon =
      status === 'SUCCESS' ? '✅' : status === 'WARNING' ? '⚠️ ' : status === 'ERROR' ? '❌' : 'ℹ️ ';
    const durationLabel = stepDurationMs !== undefined ? ` [${stepDurationMs}ms]` : '';
    if (details && Object.keys(details).length > 0 && (status === 'ERROR' || status === 'WARNING')) {
    }

    return stepLog;
  }

  finish(
    status: 'COMPLETED' | 'FAILED' | 'PARTIAL',
    extractedEntity?: ScrapeSessionSummary['extractedEntity'],
    error?: string
  ): ScrapeSessionSummary {
    const totalDurationMs = Date.now() - this.startTime;
    this.summary.status = status;
    this.summary.finishedAt = new Date().toISOString();
    this.summary.totalDurationMs = totalDurationMs;
    this.summary.extractedEntity = extractedEntity;
    this.summary.error = error;


    // Add to global buffer (newest first)
    sessionHistory.unshift(this.summary);
    if (sessionHistory.length > SESSION_HISTORY_LIMIT) {
      sessionHistory.pop();
    }

    return this.summary;
  }

  getSummary(): ScrapeSessionSummary {
    return this.summary;
  }

  getSteps(): ScrapeStepLog[] {
    return this.summary.steps;
  }
}

export class ScrapeLogger {
  static startSession(targetUrl?: string, sourceType: string = 'URL_CRAWL'): ScrapeDiagnosticsSession {
    return new ScrapeDiagnosticsSession(targetUrl, sourceType);
  }

  static getRecentSessions(limit = 20): ScrapeSessionSummary[] {
    return sessionHistory.slice(0, limit);
  }

  static getSessionById(sessionId: string): ScrapeSessionSummary | undefined {
    return sessionHistory.find((s) => s.sessionId === sessionId);
  }

  static clearHistory(): void {
    sessionHistory.length = 0;
  }
}
