import { Injectable } from '@angular/core';

@Injectable()
export class StatsService {
  // private isOdd: boolean;

  public histogramEqualise(data: Float32Array): Float32Array {
    const start = performance.now();

    const temp = data.filter(n => !isNaN(n)).sort();
    const isOdd = !!(temp.length % 2);

    const midIndex = this.median(0, temp.length);

    const Q1 = this.getMedianValueAt(
      temp,
      this.median(0, midIndex),
      isOdd
    );

    const Q3 = this.getMedianValueAt(
      temp,
      this.median(midIndex + 1, temp.length),
      isOdd
    );

    const IQR = (Q3 - Q1);

    const binWidth = 2 * (IQR / Math.pow(temp.length, 1 / 3));
    const bins = Math.ceil((temp[temp.length - 1] - temp[0]) / binWidth);

    const histogram = new Array(bins).fill(0);
    const min = temp[0];

    temp.forEach((d) => {
      const id = Math.trunc((d - min) / binWidth);
      histogram[id] = histogram[id] + 1;
    });

    const cumulative = [];
    histogram.reduce((accumulator, value, index) => {
      return cumulative[index] = accumulator + value;
    }, 0);

    const scaled = cumulative.map((v) => this.scale(v, cumulative[0], cumulative[cumulative.length - 1]));

    const equalized = data.map((d) => {
      if (isNaN(d)) {
        return d;
      }

      const id = Math.trunc((d - min) / binWidth);
      return scaled[id];
    });

    console.log(`Histogram took ${(performance.now() - start) / 1000} seconds`);
    return equalized;
  }

  private scale(value: number, min: number, max: number): number {
    return (0.75 - 0.00001) * ((value - min) / (max - min)) + 0.00001;
  }

  private getMedianValueAt(data: Float32Array, index: number, isOdd: boolean) {
    if (isOdd) {
      return data[index];
    }

    return (data[index] + data[index + 1]) / 2;
  }

  private median(start: number, range: number) {
    return Math.trunc((range - start) / 2) + start;
  }
}
