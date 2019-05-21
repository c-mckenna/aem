import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { ColourRampComponent } from '../3d/colour.ramp.component';
import { ReactiveFormsModule } from '@angular/forms';
import { ColorPickerModule } from 'ngx-color-picker';
import { WebGL1Component } from '../3d/webgl1.component';

@NgModule({
  declarations: [
    WebGL1Component,
    ColourRampComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ReactiveFormsModule,
    ColorPickerModule
  ],
  providers: [],
  bootstrap: [WebGL1Component]
})
export class AppModule { }
