export interface GanttTask {
  id: string;
  name: string;
  start: string; // ISO date
  end: string;   // ISO date
  progress?: number; // 0-100
  dependencies?: string[]; // e.g. ["proje1"]
  custom?: any; // any extra fields like ORG, Leader, STATUS
}