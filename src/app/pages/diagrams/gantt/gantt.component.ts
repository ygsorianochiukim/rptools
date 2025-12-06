import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Gantt from 'frappe-gantt';

@Component({
  selector: 'app-gantt',
  imports: [CommonModule, FormsModule],
  templateUrl: './gantt.component.html',
  styleUrls: ['./gantt.component.scss']
})
export class GanttComponent {
  @ViewChild('ganttContainer', { static: false }) ganttContainer!: ElementRef;

  googleSheetLink: string = '';
  tasks: any[] = [];

  async loadSheet() {
    try {
      const sheetId = this.extractSheetId(this.googleSheetLink);
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

      const response = await fetch(csvUrl);
      const csvText = await response.text();

      this.tasks = this.parseCsv(csvText);

      // Sort by Target End
      this.tasks.sort((a, b) => new Date(a.end).getTime() - new Date(b.end).getTime());

      this.renderGantt();

    } catch (error) {
      console.error('Failed to load sheet', error);
    }
  }

  extractSheetId(url: string): string {
    const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) throw new Error('Invalid Google Sheet URL');
    return match[1];
  }

   parseCsv(csv: string): any[] {
  const lines = csv.split('\n');
  const header = this.safeSplit(lines[0]).map(h => h.trim().toLowerCase());

  const taskList: any[] = [];

  const fixDate = (d: string) => {
    if (!d) return '';
    const parts = d.trim().split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    return d;
  };

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const row = this.safeSplit(lines[i]);
    const obj: any = {};

    header.forEach((key, index) => {
      obj[key] = row[index] || '';
    });
    const endDate = fixDate(obj['target end']);
    let startDate = '';
    let finalEnd = endDate;

    if (endDate) {
      const d = new Date(endDate);
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);

      startDate = firstDay.toISOString().split('T')[0];
      finalEnd = lastDay.toISOString().split('T')[0];
    }

    taskList.push({
      id: obj['project id'] || `id-${i}`,
      name: `${obj['project name']},Start: ${fixDate(obj['target start'])},End: ${fixDate(obj['target end'])}`,
      start: startDate,        
      end: finalEnd,           
      progress: obj['a%'] ? parseInt(obj['a%']) : 0,
      dependencies: obj['dependency'] || ''
    });
  }

  return taskList;
}

safeSplit(str: string): string[] {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (const char of str) {
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}
  private formatDate(d: string) {
    const parts = d.split('/');
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  renderGantt() {
    if (!this.ganttContainer) return;

    this.ganttContainer.nativeElement.innerHTML = ''; // reset

    new Gantt(this.ganttContainer.nativeElement, this.tasks, {
      view_mode: 'Month',
      bar_height: 25,
      padding: 20,
    });
  }
}
