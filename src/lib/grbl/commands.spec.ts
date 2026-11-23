import { describe, expect, it } from 'vitest';
import { jog, penDown, penUp, setOrigin, testSquare } from './commands';
import { axesFromDirections, type Axes } from '../geometry/types';

const plain: Axes = [1, 0, 0, 1];
const rotated = axesFromDirections('up', 'left')!;

describe('pen commands', () => {
	it('lifts with M5 and lowers with the calibrated S value', () => {
		expect(penUp()).toEqual(['M5', 'G4 P0.3']);
		expect(penDown()).toEqual(['M3 S905', 'G4 P0.3']);
	});
});

describe('jog', () => {
	it('builds a relative jog with only the moved axes', () => {
		expect(jog(10, 0, plain)).toEqual(['$J=G91 G21 X10 F3000']);
		expect(jog(0, -0.5, plain)).toEqual(['$J=G91 G21 Y-0.5 F3000']);
		expect(jog(1.25, 2, plain, 1000)).toEqual(['$J=G91 G21 X1.25 Y2 F1000']);
		expect(jog(10, -5)).toEqual(['$J=G91 G21 X10 Y5 F3000']);
	});

	it('turns arrow moves into the rotated machine axes', () => {
		expect(jog(5, 0, rotated)).toEqual(['$J=G91 G21 Y-5 F3000']);
		expect(jog(0, 5, rotated)).toEqual(['$J=G91 G21 X-5 F3000']);
	});

	it('returns nothing for a zero move', () => {
		expect(jog(0, 0)).toEqual([]);
	});
});

describe('testSquare', () => {
	it('draws relative to the current position and returns to it', () => {
		const lines = testSquare(20, { axes: plain });
		expect(lines).toContain('G91');
		expect(lines.at(-1)).toBe('G90');
		expect(lines.filter((line) => line.startsWith('G1'))).toEqual([
			'G1 X20 F1500',
			'G1 Y20',
			'G1 X-20',
			'G1 Y-20'
		]);
	});

	it('mirrors the Y axis by default', () => {
		expect(testSquare(20).filter((line) => line.startsWith('G1'))).toEqual([
			'G1 X20 F1500',
			'G1 Y-20',
			'G1 X-20',
			'G1 Y20'
		]);
	});

	it('ends with the pen up', () => {
		const lines = testSquare(10);
		expect(lines.lastIndexOf('M5')).toBeGreaterThan(lines.lastIndexOf('M3 S905'));
	});
});

describe('reference commands', () => {
	it('stores the sheet corner as a work offset', () => {
		expect(setOrigin()).toEqual(['G92.1', 'G10 L20 P1 X0 Y0']);
	});
});
