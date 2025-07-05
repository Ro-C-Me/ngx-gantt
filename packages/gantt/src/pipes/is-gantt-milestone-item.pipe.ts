import { Pipe, PipeTransform } from '@angular/core';
import { GanttItemType } from '../class';

@Pipe({
    name: 'isGanttMilestoneItem',
    standalone: true
})
export class IsGanttMilestoneItemPipe implements PipeTransform {
    transform(type: GanttItemType): boolean {
        return type === GanttItemType.milestone;
    }
}
