import { Component } from '@angular/core';
import { LucideAngularModule , House , ChartNetwork , BookText , ArrowRightLeft } from 'lucide-angular';
import { RouterLink } from "@angular/router";
@Component({
  selector: 'app-navigation',
  imports: [LucideAngularModule, RouterLink],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss'
})
export class NavigationComponent {
  readonly HouseIcon = House;
  readonly WorkflowIcon = ChartNetwork;
  readonly BookTextIcon = BookText;
  readonly ArrowRightLeftIcon = ArrowRightLeft;

}
