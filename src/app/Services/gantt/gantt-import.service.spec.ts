import { TestBed } from '@angular/core/testing';

import { GanttImportService } from './gantt-import.service';

describe('GanttImportService', () => {
  let service: GanttImportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GanttImportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
