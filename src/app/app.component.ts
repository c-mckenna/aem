import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  @ViewChild('output') output: ElementRef<HTMLCanvasElement>;

  constructor(private http: HttpClient) {
  }

  private scale(value: number): number {
    return (value - 0.00999999977648125) / (750.0000000000001 - 0.00999999977648125);
  }

  ngAfterViewInit(): void {
    const start = performance.now();

    this.http.get<any>('http://localhost:2000/test.json').subscribe((response) => {
      const height = response.length;
      const width = response[0].length;
      console.log(`${width} x ${height}`);

      this.output.nativeElement.width = width;
      this.output.nativeElement.height = height;

      const context = this.output.nativeElement.getContext('2d');
      const id = context.createImageData(1, 1);
      id[0] = 0;
      id[1] = 0;
      id[2] = 0;
      id[3] = 1;

      context.fillStyle = 'rgba(0,0,0,1)';

      for (let y = 0; y < response.length; y++) {
        for (let x = 0; x < response[y].length; x++) {
          // console.log(`[${x}, ${y}`);
          const value = response[y][x];
          if (value) {
            context.fillStyle = `rgba(100,0,0,${1 - this.scale(value)})`;
          } else {
            context.fillStyle = 'rgba(0,0,0,0)';
          }

          // context.putImageData(id, x, y);
          context.fillRect(x, y, 1, 1);
        }
      }

      const end = performance.now();

      console.log(`Render took ${end - start} milliseconds.`);
    });
  }
}
