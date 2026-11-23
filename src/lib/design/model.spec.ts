import { describe, expect, it } from 'vitest';
import { centred, extent, normalize, place, rotated, scaleFromCorner } from './model';

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

describe('rotation', () => {
	const wide = normalize([
		[
			{ x: 0, y: 0 },
			{ x: 40, y: 0 },
			{ x: 40, y: 10 }
		]
	]);

	it('swaps width and height for quarter turns', () => {
		expect(extent(wide, 90)).toEqual({ width: 10, height: 40 });
		expect(extent(wide, 180)).toEqual({ width: 40, height: 10 });
	});

	it('turns the drawing clockwise inside its box', () => {
		const [line] = place(wide, { x: 0, y: 0, scale: 1, rotation: 90 });
		expect(line).toEqual([
			{ x: 10, y: 0 },
			{ x: 10, y: 40 },
			{ x: 0, y: 40 }
		]);
	});

	it('keeps the centre when rotating and returns after four turns', () => {
		let placement = { x: 100, y: 50, scale: 2 };
		const centre = (p: typeof placement & { rotation?: 0 | 90 | 180 | 270 }) => {
			const size = extent(wide, p.rotation);
			return { x: p.x + (size.width * p.scale) / 2, y: p.y + (size.height * p.scale) / 2 };
		};
		const start = centre(placement);
		for (let i = 0; i < 4; i++) {
			placement = rotated(wide, placement);
			expect(centre(placement)).toEqual(start);
		}
		expect(placement).toEqual({ x: 100, y: 50, scale: 2, rotation: 0 });
	});
});
