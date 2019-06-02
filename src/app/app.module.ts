import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { ColourRampComponent } from '../3d/colour.ramp.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ColorPickerModule } from 'ngx-color-picker';
import { WebGL1Component } from '../3d/webgl1.component';
import { HomeComponent } from '../home/home.component';
import { WebGL2Component } from '../3d/webgl2.component';
import { AppComponent } from './app.component';
import { ThreeComponent } from '../3d/three.component';
import { StatsService } from '../3d/stats.service';

@NgModule({
  declarations: [
    HomeComponent,
    AppComponent,
    WebGL1Component,
    WebGL2Component,
    ColourRampComponent,
    ThreeComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ReactiveFormsModule,
    ColorPickerModule,
    FormsModule
  ],
  exports: [
    AppComponent,
    WebGL1Component,
    WebGL2Component,
    ColourRampComponent,
    ThreeComponent
  ],
  providers: [
    StatsService
  ],
  bootstrap: [HomeComponent]
})
export class AppModule { }
