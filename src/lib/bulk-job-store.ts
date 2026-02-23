/**
 * SEO Bulk Optimize Job Store — In-Memory
 *
 * Arka planda çalışan toplu SEO optimizasyon joblarını takip eder.
 * Sayfa kapansa bile job server'da devam eder.
 *
 * NOT: Server restart durumunda joblar kaybolur.
 * Production'da Redis/DB ile değiştirilebilir.
 */

export interface BulkJobProgress {
  index: number;
  total: number;
  articleId: string;
  title: string;
  status: "success" | "failed" | "skipped" | "error";
  beforeScore: number;
  afterScore: number;
  scoreDelta: number;
  message: string;
}

export interface BulkJob {
  id: string;
  status: "running" | "completed" | "failed";
  total: number;
  current: number;
  succeeded: number;
  failed: number;
  skipped: number;
  totalImprovement: number;
  progress: BulkJobProgress[];
  startedAt: number;
  completedAt: number | null;
  error: string | null;
}

// Singleton store — Node.js module cache sayesinde server boyunca persist eder
const jobs = new Map<string, BulkJob>();

// Aynı anda sadece 1 bulk job çalışsın
let activeJobId: string | null = null;

export const BulkJobStore = {
  create(id: string, total: number): BulkJob {
    const job: BulkJob = {
      id,
      status: "running",
      total,
      current: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      totalImprovement: 0,
      progress: [],
      startedAt: Date.now(),
      completedAt: null,
      error: null,
    };
    jobs.set(id, job);
    activeJobId = id;
    return job;
  },

  get(id: string): BulkJob | null {
    return jobs.get(id) || null;
  },

  getActive(): BulkJob | null {
    if (!activeJobId) return null;
    const job = jobs.get(activeJobId);
    if (job && job.status === "running") return job;
    activeJobId = null;
    return null;
  },

  hasActiveJob(): boolean {
    return !!this.getActive();
  },

  addProgress(id: string, item: BulkJobProgress): void {
    const job = jobs.get(id);
    if (!job) return;

    job.progress.push(item);
    job.current = item.index;

    if (item.status === "success") {
      job.succeeded++;
      job.totalImprovement += item.scoreDelta;
    } else if (item.status === "skipped") {
      job.skipped++;
    } else {
      job.failed++;
    }
  },

  complete(id: string): void {
    const job = jobs.get(id);
    if (!job) return;
    job.status = "completed";
    job.completedAt = Date.now();
    if (activeJobId === id) activeJobId = null;
  },

  fail(id: string, error: string): void {
    const job = jobs.get(id);
    if (!job) return;
    job.status = "failed";
    job.error = error;
    job.completedAt = Date.now();
    if (activeJobId === id) activeJobId = null;
  },

  /**
   * Frontend'e progress dönerken son N'den sonrasını getir (incremental polling)
   */
  getProgressSince(id: string, sinceIndex: number): BulkJobProgress[] {
    const job = jobs.get(id);
    if (!job) return [];
    return job.progress.filter((p) => p.index > sinceIndex);
  },

  /**
   * Eski job'ları temizle (1 saat sonra)
   */
  cleanup(): void {
    const oneHour = 60 * 60 * 1000;
    const now = Date.now();
    for (const [id, job] of jobs) {
      if (job.completedAt && now - job.completedAt > oneHour) {
        jobs.delete(id);
      }
    }
  },
};
