import { describe, expect, it } from 'vitest';
import { centred, normalize, place, scaleFromCorner } from './model';

const square = normalize([
	[
		{ x: 10, y: 20 },
		{ x: 30, y: 20 },
		{ x: 30, y: 40 }
	]
]);

describe('normalize', () => {
	it('moves the shape to the origin and measures it', () => {
		expect(square.width).toBe(20);
		expect(square.height).toBe(20);
		expect(square.lines[0][0]).toEqual({ x: 0, y: 0 });
	});

	it('handles empty input', () => {
		expect(normalize([])).toEqual({ lines: [], width: 0, height: 0 });
	});
});

describe('place', () => {
	it('scales and then translates', () => {
		expect(place(square, { x: 5, y: 5, scale: 2 })[0][1]).toEqual({ x: 45, y: 5 });
	});
});

describe('centred', () => {
	it('centres a shape and shrinks it to fit the share of the area', () => {
		const big = normalize([
			[
				{ x: 0, y: 0 },
				{ x: 200, y: 100 }
			]
		]);
		const placement = centred(big, { x: 10, y: 10, width: 100, height: 100 });
		expect(placement.scale).toBeCloseTo(0.3, 5);
		expect(placement.x).toBeCloseTo(30, 5);
		expect(placement.y).toBeCloseTo(45, 5);
	});

	it('never enlarges a small shape', () => {
		expect(centred(square, { x: 0, y: 0, width: 500, height: 500 }).scale).toBe(1);
	});
});

describe('scaleFromCorner', () => {
	it('keeps the aspect ratio and follows the larger drag direction', () => {
		const placement = scaleFromCorner(square, { x: 0, y: 0, scale: 1 }, { x: 60, y: 30 });
		expect(placement.scale).toBe(3);
	});

	it('does not shrink below the minimum size', () => {
		const placement = scaleFromCorner(square, { x: 0, y: 0, scale: 1 }, { x: -5, y: -5 }, 4);
		expect(placement.scale).toBeCloseTo(0.2, 5);
	});
});
