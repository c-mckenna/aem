import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { auditTime } from 'rxjs/operators';

interface ColourRampStep {
  percent: number;
  colour: string;
}

interface PresetRamp {
  title: string;
  ramp: ColourRampStep[];
}

@Component({
  selector: 'app-colour-ramp',
  templateUrl: './colour.ramp.component.html'
})
export class ColourRampComponent implements OnInit, AfterViewInit {
  @ViewChild('ramp') ramp: ElementRef<HTMLCanvasElement>;

  @Output()
  colourRampUpdate = new EventEmitter();

  @Input()
  throttle = 0;

  private updateQueue = new Subject();

  colourRampForm: FormGroup;

  presetRamps: PresetRamp[] = [
    {
      title: 'Default',
      ramp: [
        { percent: 0.0, colour: '#404040' },
        { percent: 0.1, colour: '#ff4e00' },
        { percent: 0.2, colour: '#fdfd2e' },
        { percent: 0.3, colour: '#b2abd2' },
        { percent: 1.0, colour: '#5e3c99' }
      ]
    },
    {
      title: 'AEM Legend',
      ramp: [
        { percent: 0.0, colour: '#00008d' },
        { percent: 0.46, colour: '#02ddfd' },
        { percent: 0.96, colour: '#ffdd30' },
        { percent: 1.0, colour: '#7d0306' }
      ]
    }
  ];
  selectedPreset: PresetRamp = this.presetRamps[0];

  constructor(private formBuilder: FormBuilder) {
  }

  ngOnInit(): void {
    this.colourRampForm = this.formBuilder.group({
      steps: this.getStepsForm(this.presetRamps[0].ramp)
    });

    this.updateQueue.pipe(auditTime(this.throttle)).subscribe(() => {
      const ramp = this.setColorRamp(this.colourRampForm.value);
      this.colourRampUpdate.emit(ramp);
    });
  }

  private getStepsForm(ramp): FormArray {
    const groups = [];
    for (const step of ramp) {
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

  usePreset(preset: PresetRamp): void {
    this.colourRampForm.setControl('steps', this.getStepsForm(preset.ramp));
    this.updateColourRamp();
  }
}
