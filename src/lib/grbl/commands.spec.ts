import { describe, expect, it } from 'vitest';
import { jog, penDown, penUp, testSquare } from './commands';

describe('pen commands', () => {
	it('lifts with M5 and lowers with the calibrated S value', () => {
		expect(penUp()).toEqual(['M5', 'G4 P0.3']);
		expect(penDown()).toEqual(['M3 S905', 'G4 P0.3']);
	});
});

describe('jog', () => {
	it('builds a relative jog with only the moved axes', () => {
		expect(jog(10, 0)).toEqual(['$J=G91 G21 X10 F3000']);
		expect(jog(0, -0.5)).toEqual(['$J=G91 G21 Y-0.5 F3000']);
		expect(jog(1.25, 2, 1000)).toEqual(['$J=G91 G21 X1.25 Y2 F1000']);
	});

	it('returns nothing for a zero move', () => {
		expect(jog(0, 0)).toEqual([]);
	});
});

describe('testSquare', () => {
	it('draws relative to the current position and returns to it', () => {
		const lines = testSquare(20);
		expect(lines).toContain('G91');
		expect(lines.at(-1)).toBe('G90');
		expect(lines.filter((line) => line.startsWith('G1'))).toEqual([
			'G1 X20 F1500',
			'G1 Y20',
			'G1 X-20',
			'G1 Y-20'
		]);
	});

	it('ends with the pen up', () => {
		const lines = testSquare(10);
		expect(lines.lastIndexOf('M5')).toBeGreaterThan(lines.lastIndexOf('M3 S905'));
	});
});
