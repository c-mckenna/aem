import { AfterViewInit, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

interface ColourRampStep {
  percent: number;
  colour: string;
}

@Component({
  selector: 'app-colour-ramp',
  templateUrl: './colour.ramp.component.html'
})
export class ColourRampComponent implements OnInit, AfterViewInit {
  @ViewChild('ramp') ramp: ElementRef<HTMLCanvasElement>;

  @Output()
  colourRampUpdate = new EventEmitter();

  private updateQueue = new Subject();

  colourRampForm: FormGroup;
  defaultColours: ColourRampStep[] = [
    { percent: 0.0, colour: '#404040' },
    { percent: 0.1, colour: '#f4a582' },
    { percent: 0.2, colour: '#fdfd2e' },
    { percent: 0.3, colour: '#b2abd2' },
    { percent: 1.0, colour: '#5e3c99' },
  ];

  constructor(private formBuilder: FormBuilder) {
  }

  ngOnInit(): void {
    this.colourRampForm = this.formBuilder.group({
      steps: this.setDefaultSteps()
    });

    this.updateQueue.pipe(debounceTime(0)).subscribe(() => {
      const ramp = this.setColorRamp(this.colourRampForm.value);
      this.colourRampUpdate.emit(ramp);
    });
  }

  private setDefaultSteps(): FormArray {
    const groups = [];
    for (const step of this.defaultColours) {
      groups.push(this.formBuilder.group({
        percent: [step.percent, Validators.required],
        colour: [step.colour, Validators.required]
      }));
    }

    return this.formBuilder.array(groups);
  }

  ngAfterViewInit(): void {
    const ramp = this.setColorRamp(this.colourRampForm.value);
    this.colourRampUpdate.emit(ramp);
  }

  private setColorRamp(colourRamp): Uint8Array {
    const canvas = this.ramp.nativeElement;
    const ctx = canvas.getContext('2d');

    canvas.width = 256;
    canvas.height = 64;

    const gradient = ctx.createLinearGradient(0, 0, 256, 0);

    for (const step of colourRamp.steps) {
      gradient.addColorStop(step.percent, step.colour);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 64);

    return new Uint8Array(ctx.getImageData(0, 0, 256, 1).data);
  }

  updateColourRamp() {
    this.updateQueue.next();
  }

  addControl(index: number) {
    const steps = this.colourRampForm.get('steps') as FormArray;

    steps.insert(index + 1, this.formBuilder.group({
      percent: 0.0,
      colour: '#ffffff'
    }));
  }

  removeControl(index: number) {
    const steps = this.colourRampForm.get('steps') as FormArray;

    steps.removeAt(index);
    this.updateColourRamp();
  }

  updateColour(step: FormGroup, $event: string) {
    step.patchValue({ colour: $event });
    this.updateColourRamp();
  }
}
