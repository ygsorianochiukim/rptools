import { Injectable } from '@angular/core';
import * as Papa from 'papaparse';
import dayjs from 'dayjs';
import { firstValueFrom, Observable, of } from 'rxjs';
import { GanttTask } from '../../Models/Task/task.model';

@Injectable({ providedIn: 'root' })
export class GanttImportService {

  // If user uploads CSV file
  parseCsvFile(file: File): Promise<GanttTask[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<any>) => {
          try {
            const tasks = this.rowsToTasks(results.data);
            resolve(this.sortByTargetEnd(tasks));
          } catch (err) { reject(err); }
        },
        error: (err: any) => reject(err)
      });
    });
  }

  // Or convert an array of rows (like from Google Sheet export) to tasks
  rowsToTasks(rows: any[]): GanttTask[] {
    return rows.map((r, i) => {
      // normalize/parse date strings robustly using dayjs
      const parseDate = (v: any) => {
        if (!v) return null;
        // try common formats
        const d = dayjs(v, ['MM/DD/YYYY','M/D/YYYY','YYYY-MM-DD','MM-DD-YYYY','MM/DD/YY','M/D/YY','DD/MM/YYYY'], true);
        if (d.isValid()) return d.toISOString();
        const fallback = dayjs(new Date(v));
        return fallback.isValid() ? fallback.toISOString() : null;
      };

      const dependencies = (r['Dependency'] || r['dependency'] || r['Dependencies'] || '')
        .toString()
        .split(/[;,|]/)
        .map((s:string)=> s.trim())
        .filter(Boolean);

      return {
        id: r['Project Id'] || r['project id'] || `task-${i}`,
        name: r['Project Name'] || r['project name'] || `Task ${i+1}`,
        start: parseDate(r['Target Start']) || parseDate(r['Actual Start']) || new Date().toISOString(),
        end: parseDate(r['Target End']) || parseDate(r['Actual End']) || parseDate(r['Target Start']) || new Date().toISOString(),
        progress: Number((r['T%'] || r['T Percent'] || r['T'] || 0).toString().replace('%','')) || 0,
        dependencies,
        custom: {
          ORG: r['ORG'] || r['org'] || '',
          leader: r['Team Leader'] || r['TeamLeader'] || r['Leader'] || '',
          status: r['STATUS'] || r['Status'] || ''
        }
      } as GanttTask;
    });
  }

  sortByTargetEnd(tasks: GanttTask[]): GanttTask[] {
    return tasks.sort((a,b) => {
      const da = new Date(a.end).getTime();
      const db = new Date(b.end).getTime();
      return da - db;
    });
  }

  // convenience: parse CSV text (if you copy/paste)
  parseCsvText(csvText: string): Promise<GanttTask[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results: { data: any[]; }) => {
          try {
            const tasks = this.rowsToTasks(results.data);
            resolve(this.sortByTargetEnd(tasks));
          } catch(e) { reject(e); }
        },
        error: (err: any) => reject(err)
      });
    });
  }
}
