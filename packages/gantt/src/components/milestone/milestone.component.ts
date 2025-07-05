import {
    Component,
    OnInit,
    HostBinding,
    ElementRef,
    OnChanges,
    OnDestroy,
    Inject,
    ViewChild,
    Output,
    EventEmitter,
    SimpleChanges,
    AfterViewInit
} from '@angular/core';
import { GanttBarClickEvent } from '../../class';
import { GANTT_UPPER_TOKEN, GanttUpper } from '../../gantt-upper';
import { GanttItemUpper } from '../../gantt-item-upper';
import { NgTemplateOutlet } from '@angular/common';
import { milestoneBackground } from '../../gantt.styles';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'ngx-gantt-milestone,gantt-milestone',
    templateUrl: './milestone.component.html',
    styleUrl: './milestone.component.scss',
    imports: [NgTemplateOutlet]
})
export class NgxGanttMilestoneComponent extends GanttItemUpper implements OnInit, AfterViewInit, OnChanges, OnDestroy {
    @Output() milestoneClick = new EventEmitter<GanttBarClickEvent>();

    @ViewChild('content') contentElementRef: ElementRef<HTMLDivElement>;

    @HostBinding('class.gantt-milestone') ganttMilestoneClass = true;

    constructor(
        elementRef: ElementRef<HTMLDivElement>,
        @Inject(GANTT_UPPER_TOKEN) public override ganttUpper: GanttUpper
    ) {
        super(elementRef, ganttUpper);
    }

    override ngOnInit() {
        super.ngOnInit();

        // Set style when refs change (like other components do)
        this.item.refs$.pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
            setTimeout(() => {
                this.setMilestoneStyle();
            }, 0);
        });
    }

    ngAfterViewInit() {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            this.setMilestoneStyle();
        }, 0);
    }

    override ngOnChanges(changes: SimpleChanges): void {
        super.ngOnChanges(changes);
        if (!this.firstChange && changes.item) {
            setTimeout(() => {
                this.setMilestoneStyle();
            }, 0);
        }
    }

    onMilestoneClick(event: Event) {
        this.milestoneClick.emit({ event, item: this.item.origin });
    }

    private setMilestoneStyle() {
        if (this.contentElementRef) {
            const contentElement = this.contentElementRef.nativeElement;
            const diamondElement = contentElement.querySelector('.gantt-milestone-diamond') as HTMLElement;

            if (diamondElement) {
                const color = this.item.color || milestoneBackground;
                diamondElement.style.backgroundColor = color;

                // Apply custom styles if provided
                if (this.item.barStyle) {
                    Object.assign(diamondElement.style, this.item.barStyle);
                }
            }
        }
    }
}
