import { Component } from '@angular/core';

type Mode = 'cpu' | 'webgl1' | 'webgl2' | 'three';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  mode: Mode = 'three';

  switch(mode: Mode): void {
    this.mode = mode;
  }
}
