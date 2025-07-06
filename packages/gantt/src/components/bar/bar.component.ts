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
    AfterViewInit,
    ViewChildren,
    QueryList,
    NgZone,
    SimpleChanges
} from '@angular/core';
import { from, fromEvent, merge, Observable } from 'rxjs';
import { startWith, switchMap, take, takeUntil } from 'rxjs/operators';
import { GanttBarDrag } from './bar-drag';
import { hexToRgb } from '../../utils/helpers';
import { GanttDragContainer } from '../../gantt-drag-container';
import { barBackground, milestoneBackground } from '../../gantt.styles';
import { GanttBarClickEvent, GanttItemType } from '../../class';
import { GANTT_UPPER_TOKEN, GanttUpper } from '../../gantt-upper';
import { GanttItemUpper } from '../../gantt-item-upper';
import { NgTemplateOutlet } from '@angular/common';

function linearGradient(sideOrCorner: string, color: string, stop: string) {
    return `linear-gradient(${sideOrCorner},${color} 0%,${stop} 40%)`;
}

@Component({
    selector: 'ngx-gantt-bar,gantt-bar',
    templateUrl: './bar.component.html',
    styleUrl: './bar.component.scss',
    providers: [GanttBarDrag],
    imports: [NgTemplateOutlet]
})
export class NgxGanttBarComponent extends GanttItemUpper implements OnInit, AfterViewInit, OnChanges, OnDestroy {
    @Output() barClick = new EventEmitter<GanttBarClickEvent>();

    @ViewChild('content') contentElementRef: ElementRef<HTMLDivElement>;

    @HostBinding('class.gantt-bar') ganttBarClass = true;

    @HostBinding('class.gantt-milestone')
    get ganttMilestoneClass() {
        return this.item?.origin?.type === GanttItemType.milestone;
    }

    get isMilestone() {
        return this.item?.origin?.type === GanttItemType.milestone;
    }

    @ViewChildren('handle') handles: QueryList<ElementRef<HTMLElement>>;

    constructor(
        private dragContainer: GanttDragContainer,
        private drag: GanttBarDrag,
        elementRef: ElementRef<HTMLDivElement>,
        @Inject(GANTT_UPPER_TOKEN) public override ganttUpper: GanttUpper,
        private ngZone: NgZone
    ) {
        super(elementRef, ganttUpper);
    }

    override ngOnInit() {
        super.ngOnInit();
        this.dragContainer.dragStarted.pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
            this.elementRef.nativeElement.style.pointerEvents = 'none';
        });
        this.dragContainer.dragEnded.pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
            this.elementRef.nativeElement.style.pointerEvents = '';
            this.setContentBackground();
        });
    }

    override ngOnChanges(changes: SimpleChanges): void {
        super.ngOnChanges(changes);
        if (!this.firstChange) {
            this.drag.updateItem(this.item);

            if (
                changes.item.currentValue.refs?.width !== changes.item.previousValue.refs?.width ||
                changes.item.currentValue.color !== changes.item.previousValue.color ||
                changes.item.currentValue.start?.value !== changes.item.previousValue.start?.value ||
                changes.item.currentValue.end?.value !== changes.item.previousValue.end?.value
            ) {
                this.setContentBackground();
            }
        }
    }

    ngAfterViewInit() {
        // Note: the zone may be nooped through `BootstrapOptions` when bootstrapping the root module. This means
        // the `onStable` will never emit any value.
        const onStable$ = this.ngZone.isStable ? from(Promise.resolve()) : this.ngZone.onStable.pipe(take(1));
        // Normally this isn't in the zone, but it can cause performance regressions for apps
        // using `zone-patch-rxjs` because it'll trigger a change detection when it unsubscribes.
        this.ngZone.runOutsideAngular(() => {
            onStable$.pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
                this.drag.initialize(this.elementRef, this.item, this.ganttUpper);
            });
        });

        this.setContentBackground();

        this.handles.changes
            .pipe(
                startWith(this.handles),
                switchMap(
                    () =>
                        // Note: we need to explicitly subscribe outside of the Angular zone since `addEventListener`
                        // is called when the `fromEvent` is subscribed.
                        new Observable<Event>((subscriber) =>
                            this.ngZone.runOutsideAngular(() =>
                                merge(...this.handles.toArray().map((handle) => fromEvent(handle.nativeElement, 'mousedown'))).subscribe(
                                    subscriber
                                )
                            )
                        )
                ),
                takeUntil(this.unsubscribe$)
            )
            .subscribe((event) => {
                event.stopPropagation();
            });
    }

    onBarClick(event: Event) {
        this.barClick.emit({ event, item: this.item.origin });
    }

    private setContentBackground() {
        if (this.item.refs?.width) {
            const contentElement = this.contentElementRef.nativeElement;

            // Handle milestone styling - needs to be checked first and early
            if (this.isMilestone) {
                console.log('Is milestone, calling setMilestoneStyle');
                // Clear any existing styling on content element for milestones
                contentElement.style.background = '';
                contentElement.style.backgroundColor = '';
                contentElement.style.borderRadius = '';

                // Use setTimeout to ensure DOM is ready, like in the original milestone component
                setTimeout(() => {
                    this.setMilestoneStyle(contentElement);
                }, 0);
                return; // Exit early, don't apply bar styling to milestones
            }

            // Handle regular bar styling only for non-milestones
            const color = this.item.color || barBackground;
            const style: Partial<CSSStyleDeclaration> = this.item.barStyle || {};
            const barElement = this.elementRef.nativeElement;

            if (this.item.origin.start && this.item.origin.end) {
                style.background = color;
                style.borderRadius = '';
            }
            if (this.item.origin.start && !this.item.origin.end) {
                style.background = linearGradient('to left', hexToRgb(color, 0.55), hexToRgb(color, 1));

                const borderRadius = '4px 12.5px 12.5px 4px';
                style.borderRadius = borderRadius;
                barElement.style.borderRadius = borderRadius;
            }
            if (!this.item.origin.start && this.item.origin.end) {
                style.background = linearGradient('to right', hexToRgb(color, 0.55), hexToRgb(color, 1));

                const borderRadius = '12.5px 4px 4px 12.5px';
                style.borderRadius = borderRadius;
                barElement.style.borderRadius = borderRadius;
            }
            if (this.item.progress >= 0) {
                const contentProgressElement = contentElement.querySelector('.gantt-bar-content-progress') as HTMLDivElement;
                style.background = hexToRgb(color, 0.3);
                style.borderRadius = '';
                contentProgressElement.style.background = color;
            }

            for (const key in style) {
                if (style.hasOwnProperty(key)) {
                    contentElement.style[key] = style[key];
                }
            }
        }
    }

    private setMilestoneStyle(contentElement: HTMLDivElement) {
        const diamondElement = contentElement.querySelector('.gantt-milestone-diamond') as HTMLElement;

        if (diamondElement) {
            // Use item color if set, otherwise fall back to orange default
            const finalColor = this.item.color || milestoneBackground;

            console.log('DEBUG Milestone colors:');
            console.log('- item.color:', this.item.color);
            console.log('- milestoneBackground:', milestoneBackground);
            console.log('- final color used:', finalColor);

            diamondElement.style.setProperty('background-color', finalColor, 'important');

            // Apply custom styles if provided
            if (this.item.barStyle) {
                console.log('- applying barStyle:', this.item.barStyle);
                Object.entries(this.item.barStyle).forEach(([key, value]) => {
                    if (key === 'backgroundColor' || key === 'background-color') {
                        diamondElement.style.setProperty('background-color', value as string, 'important');
                    } else {
                        diamondElement.style.setProperty(key, value as string);
                    }
                });
            }
        } else {
            console.log('Diamond element not found for milestone item:', this.item.origin);
        }
    }

    stopPropagation(event: Event) {
        event.stopPropagation();
    }
}
