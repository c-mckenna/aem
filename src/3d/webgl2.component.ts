import { AfterViewInit, Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { createProgramInfo, ProgramInfo, resizeCanvasToDisplaySize } from 'twgl.js';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-root',
  templateUrl: './webgl2.component.html',
  styleUrls: ['./webgl2.component.css']
})
export class WebGL2Component implements AfterViewInit {
  @ViewChild('output') output: ElementRef<HTMLCanvasElement>;

  private gl: WebGL2RenderingContext;
  private programInfo: ProgramInfo;
  private colourRamp: Uint8Array;
  private data;
  private width = 4144;
  private height = 690;
  loaded = false;
  queryResult: string;

  constructor(private http: HttpClient) {
  }

  ngAfterViewInit(): void {
    this.gl = this.output.nativeElement.getContext('webgl2', {preserveDrawingBuffer: true});

    // Vertex shader from https://webglfundamentals.org/webgl/lessons/webgl-image-processing.html
    const vs = `
attribute vec2 a_position;
attribute vec2 a_texcoord;

uniform vec2 u_resolution;

varying vec2 v_texCoord;

void main() {
  // convert the rectangle from pixels to 0.0 to 1.0
  vec2 zeroToOne = a_position / u_resolution;

  // convert from 0->1 to 0->2
  vec2 zeroToTwo = zeroToOne * 2.0;

  // convert from 0->2 to -1->+1 (clipspace)
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  // gl_Position = vec4(10, 10, 0, 1);

  // pass the texCoord to the fragment shader
  // The GPU will interpolate this value between points.
  v_texCoord = a_texcoord;
}`;

    // Fragment shader adapted from https://github.com/mapbox/webgl-wind
    const fs = `
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
  }
}`;

    this.programInfo = createProgramInfo(this.gl, [vs, fs]);

    // Little endian float32 byte array
    this.http.request('GET', 'assets/1090002.bin', {responseType: 'arraybuffer'}).subscribe((response) => {
      this.data = new Float32Array(response);
      this.loaded = true;
      requestAnimationFrame(this.render.bind(this));
    });
  }

  private render(): void {
    if (!this.data || !this.colourRamp) {
      return;
    }

    const start = performance.now();

    const gl = this.gl;

    this.output.nativeElement.width = this.width;
    this.output.nativeElement.height = this.height;

    gl.useProgram(this.programInfo.program);

    const positionLocation = gl.getAttribLocation(this.programInfo.program, 'a_position');
    const texcoordLocation = gl.getAttribLocation(this.programInfo.program, 'a_texcoord');

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    this.setRectangle(gl, 0, 0, this.width, this.height);

    const texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0.0,  0.0,
      1.0,  0.0,
      0.0,  1.0,
      0.0,  1.0,
      1.0,  0.0,
      1.0,  1.0,
    ]), gl.STATIC_DRAW);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, this.width, this.height, 0, gl.RED, gl.FLOAT, this.data);
    gl.bindTexture(gl.TEXTURE_2D, null);

    const cr = this.setColorRampTexture(gl);

    const uAem = gl.getUniformLocation(this.programInfo.program, 'u_aem');
    const uColorRamp = gl.getUniformLocation(this.programInfo.program, 'u_color_ramp');

    gl.uniform1i(uAem, 0);
    gl.uniform1i(uColorRamp, 1);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, cr);

    const resolutionLocation = gl.getUniformLocation(this.programInfo.program, 'u_resolution');

    resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(texcoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    console.log(`Render took ${performance.now() - start} milliseconds.`);
  }

  private setRectangle(gl, x, y, width, height): void {
    const x1 = x;
    const x2 = x + width;
    const y1 = y;
    const y2 = y + height;

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      x1, y1,
      x2, y1,
      x1, y2,
      x1, y2,
      x2, y1,
      x2, y2,
    ]), gl.STATIC_DRAW);
  }

  private setColorRampTexture(gl) {
    const data = this.colourRamp;

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 16, 16, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return texture;
  }

  query(event: MouseEvent) {
    const canvas: HTMLCanvasElement = (event as any).target;
    const rect = canvas.getBoundingClientRect();

    const x = Math.trunc(event.clientX - rect.left);
    const y = Math.trunc(event.clientY - rect.top);

    const i = y * this.width + x;
    const value = this.data[i];

    if (value) {
      this.queryResult = `[${x}, ${y}, ${i}] = ${value.toFixed(5)} S\\m`;
    } else {
      this.clearQueryResult();
    }
  }

  clearQueryResult() {
    this.queryResult = '';
  }

  updateColourRamp(ramp): void {
    this.colourRamp = ramp;
    requestAnimationFrame(this.render.bind(this));
  }

  saveImage() {
    this.output.nativeElement.toBlob((blob) => {
      saveAs(blob, 'aem.png');
    });
  }
}
