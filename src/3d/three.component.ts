import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Camera,
  DataTexture,
  DoubleSide,
  FloatType,
  LinearFilter,
  LuminanceFormat,
  Mesh,
  NearestFilter,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Renderer,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { StatsService } from './stats.service';
import { saveAs } from 'file-saver';
import * as tiff from 'tiff';

@Component({
  selector: 'app-three',
  templateUrl: './three.component.html',
  styleUrls: ['./three.component.css']
})
export class ThreeComponent implements AfterViewInit {
  @ViewChild('output') output: ElementRef<HTMLCanvasElement>;

  private width = 4144;
  private height = 690;
  private colourRamp = new Uint8Array(1024);
  private originalData = new Float32Array(this.width * this.height);
  private sourceData = new Float32Array(this.width * this.height);
  private equalisedData;
  histogramEqualise = false;

  loaded = false;
  queryResult: string;

  private camera: Camera;
  private scene: Scene;
  private renderer: Renderer;
  private raycaster: Raycaster;
  private mouse;

  private dataTexture = new DataTexture(this.sourceData, this.width, this.height, LuminanceFormat, FloatType);
  private colourRampTexture = new DataTexture(this.colourRamp, 16, 16, RGBAFormat);

  private vs = `
varying vec2 v_texCoord;

void main() {
  v_texCoord = uv;

  gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(position,1.0);
}
  `;

  private fs = `
precision mediump float;

// our texture
uniform sampler2D u_aem;
uniform sampler2D u_color_ramp;

// the texCoords passed in from the vertex shader.
varying vec2 v_texCoord;

float scale(const float value) {
  return (value - 0.00001) / (0.75 - 0.00001);
}

bool isnan(float val) {
  return ( val < 0.0 || 0.0 < val || val == 0.0 ) ? false : true;
}

void main() {
  vec4 value = texture2D(u_aem, v_texCoord);

  if (isnan(value.r)) {
    gl_FragColor = vec4(0, 0, 0, 0);
  } else {
    float v = scale(value.r);

    vec2 ramp_pos = vec2(
        fract(16.0 * v),
        floor(16.0 * v) / 16.0);

    gl_FragColor = texture2D(u_color_ramp, ramp_pos);
    // gl_FragColor = vec4(value.r, value.g, value.b, 1);
  }
}
  `;

  constructor(private http: HttpClient, private statsService: StatsService) {
  }

  clearQueryResult() {
    this.queryResult = '';
  }

  updateColourRamp(ramp: Uint8Array): void {
    this.colourRamp.set(ramp);
    this.colourRampTexture.needsUpdate = true;
  }

  mouseMove(event: MouseEvent): void {
    const canvas: HTMLCanvasElement = (event as any).target;
    const rect = canvas.getBoundingClientRect();

    const x = Math.trunc(event.clientX - rect.left);
    const y = Math.trunc(event.clientY - rect.top);

    if (!this.mouse) {
      this.mouse = new Vector2();
    }

    this.mouse.x = (x / rect.width) * 2 - 1;
    this.mouse.y = -(y / rect.height) * 2 + 1;
  }

  ngAfterViewInit(): void {
    const width = window.innerWidth;
    const height = 600;

    this.output.nativeElement.width = width;
    this.output.nativeElement.height = height;

    this.http.request('GET', 'assets/1090002.tiff', {responseType: 'arraybuffer'}).subscribe(async (response) => {
      const image = tiff.decode(response);
      this.sourceData.set(new Float32Array(image[0].data));
      this.originalData.set(this.sourceData);

      this.loaded = true;

      this.renderer = new WebGLRenderer({
        canvas: this.output.nativeElement,
        antialias: true,
        preserveDrawingBuffer: true
      });

      this.dataTexture.magFilter = NearestFilter;
      this.dataTexture.minFilter = LinearFilter;
      // this.dataTexture.anisotropy = (this.renderer as WebGLRenderer).capabilities.getMaxAnisotropy();
      this.dataTexture.flipY = true;
      this.dataTexture.needsUpdate = true;

      this.camera = new PerspectiveCamera(75, width / height, 1, 20000);
      const controls = new OrbitControls(this.camera, this.output.nativeElement);
      this.scene = new Scene();
      // this.scene.background = new Color(255, 255, 255);

      this.raycaster = new Raycaster();

      const geometry = new PlaneGeometry(this.width * 5, this.height, 1, 1);

      const material = new ShaderMaterial({
        vertexShader: this.vs,
        fragmentShader: this.fs,
        side: DoubleSide,
        uniforms: {
          u_color_ramp: { type: 'sampler2D', value: this.colourRampTexture },
          u_aem: { type: 'sampler2D', value: this.dataTexture }
        },
        transparent: true
      });

      const mesh = new Mesh(geometry, material);
      this.scene.add(mesh);

      this.camera.position.set(0, 0, 10000);
      controls.update();

      const animate = () => {
        requestAnimationFrame(animate);
        controls.update();

        if (this.mouse) {
          this.raycastQuery(mesh);
        }

        this.renderer.render(this.scene, this.camera);
      };

      animate();
    });
  }

  private raycastQuery(mesh): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const results = this.raycaster.intersectObject(mesh);

    if (results.length > 0) {
      const intersection = results[0];

      const x = Math.trunc(this.width * intersection.uv.x);
      const y = Math.trunc(this.height * (1 - intersection.uv.y));

      const i = y * this.width + x;
      const value = this.sourceData[i];

      if (value) {
        // this.queryResult = `[${x}, ${y}, ${i}] = ${value.toFixed(5)} S\\m`;
        this.queryResult = `${value.toFixed(5)} S\\m`;
      } else {
        this.clearQueryResult();
      }
    } else {
      this.clearQueryResult();
    }
  }

  toggleHistogramEqualise(): void {
    this.histogramEqualise = !this.histogramEqualise;

    if (this.histogramEqualise) {
      if (!this.equalisedData) {
        this.equalisedData = this.statsService.histogramEqualise(this.sourceData);
      }

      this.sourceData.set(this.equalisedData);
    } else {
      this.sourceData.set(this.originalData);
    }

    this.dataTexture.needsUpdate = true;
  }

  saveImage() {
    this.output.nativeElement.toBlob((blob) => {
      saveAs(blob, 'aem.png');
    });
  }
}
