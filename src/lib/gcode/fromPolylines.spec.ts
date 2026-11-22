import { describe, expect, it } from 'vitest';
import { estimateSeconds, outsideArea, toGcode } from './fromPolylines';

const line = (...coords: number[]) => {
	const points = [];
	for (let i = 0; i < coords.length; i += 2) points.push({ x: coords[i], y: coords[i + 1] });
	return points;
};

describe('toGcode', () => {
	it('lifts the pen for travel and lowers it to draw', () => {
		expect(toGcode([line(10, 10, 20, 10, 20, 20)], { feed: 1500 })).toEqual([
			'G21',
			'G90',
			'G94',
			'M5',
			'G4 P0.3',
			'G0 X10 Y10',
			'M3 S905',
			'G4 P0.3',
			'G1 X20 Y10 F1500',
			'G1 X20 Y20',
			'M5',
			'G4 P0.3',
			'G0 X0 Y0'
		]);
	});

	it('keeps the pen down when the next stroke starts where the last ended', () => {
		const gcode = toGcode([line(0, 0, 5, 0), line(5, 0, 5, 5)]);
		expect(gcode.filter((l) => l.startsWith('M3'))).toHaveLength(1);
	});

	it('lifts between separate strokes', () => {
		const gcode = toGcode([line(0, 0, 5, 0), line(10, 0, 15, 0)]);
		expect(gcode.filter((l) => l.startsWith('M3'))).toHaveLength(2);
		expect(gcode.at(-1)).toBe('G0 X0 Y0');
	});

	it('mirrors the Y axis when inverted', () => {
		const gcode = toGcode([line(10, 5, 20, 5)], { invertY: true, feed: 1500 });
		expect(gcode).toContain('G0 X10 Y-5');
		expect(gcode).toContain('G1 X20 Y-5 F1500');
		expect(gcode.at(-1)).toBe('G0 X0 Y0');
	});

	it('uses the configured pen down value', () => {
		expect(toGcode([line(0, 0, 5, 0)], { penDownS: 960 })).toContain('M3 S960');
	});

	it('rounds coordinates to micrometres', () => {
		expect(toGcode([line(1.23456, 0, 2, 0)])).toContain('G0 X1.235 Y0');
	});
});

describe('outsideArea', () => {
	it('flags points beyond the sheet or with negative coordinates', () => {
		expect(outsideArea([line(0, 0, 100, 50)], 105, 148)).toBe(false);
		expect(outsideArea([line(0, 0, 106, 50)], 105, 148)).toBe(true);
		expect(outsideArea([line(-1, 0, 10, 10)], 105, 148)).toBe(true);
	});
});

describe('estimateSeconds', () => {
	it('adds drawing time, travel and pen dwells', () => {
		const seconds = estimateSeconds([line(0, 0, 25, 0)], 1500);
		expect(seconds).toBeCloseTo((25 / 1500) * 60 + (25 / 5000) * 60 + 2 * 0.3, 5);
	});
});
