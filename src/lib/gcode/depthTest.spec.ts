import { describe, expect, it } from 'vitest';
import { bounds } from '../geometry/types';
import { depthTest, depthTestGcode, depthValues, maxDepthRows } from './depthTest';
import { outsideArea } from './fromPolylines';

const A4 = { width: 210, height: 297 };

describe('depthValues', () => {
	it('steps from low to high and stays within the servo range', () => {
		expect(depthValues(880, 840, 10)).toEqual([840, 850, 860, 870, 880]);
		expect(depthValues(990, 1020, 20)).toEqual([990]);
		expect(depthValues(5, -10, 0)).toEqual([0, 1, 2, 3, 4, 5]);
	});
});

describe('depthTest', () => {
	it('spreads one labelled line per value over the sheet inside the margin', () => {
		const rows = depthTest([840, 860, 880], A4, 10);
		const lines = rows.map((row) => row.polylines.at(-1)!);
		expect(lines.map((line) => line[0].y)).toEqual([15, 148.5, 282]);
		for (const line of lines) {
			expect(line[0].y).toBe(line[1].y);
			expect(line[1].x).toBe(200);
		}
		const all = rows.flatMap((row) => row.polylines);
		expect(outsideArea(all, A4.width, A4.height)).toBe(false);
		const b = bounds(all)!;
		expect(b.minX).toBeCloseTo(10, 5);
		expect(b.minY).toBeGreaterThanOrEqual(10);
		expect(b.maxY).toBeLessThanOrEqual(287);
		const label = bounds(rows[0].polylines.slice(0, -1))!;
		expect(label.maxX).toBeLessThan(lines[0][0].x);
	});

	it('limits the rows so they keep a readable spacing', () => {
		expect(maxDepthRows(A4, 10)).toBe(34);
		expect(maxDepthRows({ width: 100, height: 20 }, 10)).toBe(0);
	});
});

describe('depthTestGcode', () => {
	it('lowers the pen with each row value and returns home once at the end', () => {
		const gcode = depthTestGcode(depthTest([850, 900], A4, 10), { axes: [1, 0, 0, 1] });
		const downs = gcode.filter((line) => line.startsWith('M3'));
		expect(new Set(downs)).toEqual(new Set(['M3 S850', 'M3 S900']));
		expect(downs.indexOf('M3 S900')).toBeGreaterThan(downs.lastIndexOf('M3 S850'));
		expect(gcode.filter((line) => line === 'G0 X0 Y0')).toHaveLength(1);
		expect(gcode.at(-1)).toBe('G0 X0 Y0');
	});
});
