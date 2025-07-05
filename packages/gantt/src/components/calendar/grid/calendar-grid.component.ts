import { Component, OnInit, HostBinding, OnChanges, SimpleChanges, OnDestroy, NgZone, Inject, ElementRef } from '@angular/core';
import { Subject, merge } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

import { isNumber } from '../../../utils/helpers';

import { GANTT_UPPER_TOKEN, GanttUpper } from '../../../gantt-upper';
import { GanttViewType } from './../../../class/view-type';
import { todayBorderRadius } from '../../../gantt.styles';

const mainHeight = 5000;

@Component({
    selector: 'gantt-calendar-grid',
    templateUrl: './calendar-grid.component.html',
    standalone: true
})
export class GanttCalendarGridComponent implements OnInit, OnDestroy {
    get view() {
        return this.ganttUpper.view;
    }
    private unsubscribe$ = new Subject<void>();

    mainHeight = mainHeight;

    todayBorderRadius = todayBorderRadius;

    viewTypes = GanttViewType;

    @HostBinding('class') className = `gantt-calendar gantt-calendar-grid`;

    constructor(
        @Inject(GANTT_UPPER_TOKEN) public ganttUpper: GanttUpper,
        private ngZone: NgZone,
        private elementRef: ElementRef<HTMLElement>
    ) {}

    setTodayPoint() {
        const x = this.view.getTodayXPoint();
        const todayEle = this.elementRef.nativeElement.getElementsByClassName('gantt-calendar-today-overlay')[0] as HTMLElement;
        const line = this.elementRef.nativeElement.getElementsByClassName('today-line')[0] as HTMLElement;

        if (isNumber(x)) {
            if (line) {
                line.style.left = `${x}px`;
                line.style.top = `0px`;
                line.style.bottom = `${-mainHeight}px`;
            }
        } else {
            todayEle.style.display = 'none';
        }
    }

    setCustomDateLines() {
        const customDatePoints = this.view.getCustomDateXPoints();
        const overlay = this.elementRef.nativeElement.getElementsByClassName('gantt-calendar-today-overlay')[0] as HTMLElement;

        // Remove existing custom lines and labels
        const existingCustomLines = overlay.querySelectorAll('.custom-date-line');
        const existingCustomLabels = overlay.querySelectorAll('.custom-date-label');
        existingCustomLines.forEach((line) => line.remove());
        existingCustomLabels.forEach((label) => label.remove());

        // Add new custom lines and labels
        customDatePoints.forEach((point, index) => {
            // Create the line
            const line = document.createElement('span');
            line.className = 'custom-date-line';
            line.style.left = `${point.x}px`;
            line.style.top = `0px`;
            line.style.bottom = `${-mainHeight}px`;
            line.setAttribute('data-date', point.date.format('yyyy-MM-dd'));
            overlay.appendChild(line);

            // Create the label at the top of the line
            const label = document.createElement('span');
            label.className = 'custom-date-label';
            label.textContent = 'Custom';
            label.style.left = `${point.x}px`;
            label.style.top = '0px';
            overlay.appendChild(label);
        });
    }

    ngOnInit() {
        // Test: Füge ein Datum hinzu, das näher am aktuellen Zeitbereich liegt
        this.view.setCustomDateLines([new Date(2025, 6, 15)]); // 15. Juli 2025

        this.ngZone.onStable.pipe(take(1)).subscribe(() => {
            merge(this.ganttUpper.viewChange, this.ganttUpper.view.start$)
                .pipe(takeUntil(this.unsubscribe$))
                .subscribe(() => {
                    this.setTodayPoint();
                    this.setCustomDateLines();
                });
        });
    }

    ngOnDestroy() {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
}
