import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';

import { RoomdesignerComponent } from './roomdesigner';

describe('RoomdesignerComponent', () => {
  let component: RoomdesignerComponent;
  let fixture: ComponentFixture<RoomdesignerComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomdesignerComponent, HttpClientModule, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoomdesignerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
