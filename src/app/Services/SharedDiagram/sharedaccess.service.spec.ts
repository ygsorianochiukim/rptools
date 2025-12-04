import { TestBed } from '@angular/core/testing';

import { SharedaccessService } from './sharedaccess.service';

describe('SharedaccessService', () => {
  let service: SharedaccessService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SharedaccessService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
