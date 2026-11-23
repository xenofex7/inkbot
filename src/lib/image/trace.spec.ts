import { describe, expect, it } from 'vitest';
import { bounds } from '../geometry/types';
import { orderPaths, travelDistance } from '../optimize/order';
import {
	binarize,
	grayFromRgba,
	simplify,
	smooth,
	thin,
	traceImage,
	tracePixels,
	type Gray
} from './trace';

function canvas(width: number, height: number, ink: (x: number, y: number) => boolean): Gray {
	const data = new Uint8ClampedArray(width * height);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) data[y * width + x] = ink(x, y) ? 0 : 255;
	}
	return { width, height, data };
}

const base = { threshold: 128, hatchSpacing: 3, simplify: 0.8, minLength: 1 };

describe('grayFromRgba', () => {
	it('treats transparent pixels as white paper', () => {
		const gray = grayFromRgba(new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 255]), 2, 1);
		expect([...gray.data]).toEqual([255, 0]);
	});
});

describe('thin', () => {
	it('reduces a thick bar to a one pixel line', () => {
		const gray = canvas(30, 11, (x, y) => x >= 3 && x < 27 && y >= 4 && y <= 6);
		const skeleton = thin(binarize(gray, 128), 30, 11);
		const rows = new Set<number>();
		skeleton.forEach((v, i) => v && rows.add(Math.floor(i / 30)));
		expect(rows.size).toBeLessThanOrEqual(2);
		expect(skeleton.reduce((sum, v) => sum + v, 0)).toBeGreaterThan(15);
	});
});

describe('tracePixels', () => {
	it('follows a diagonal pixel line as one polyline', () => {
		const mask = new Uint8Array(100);
		for (let i = 0; i < 10; i++) mask[i * 10 + i] = 1;
		const lines = tracePixels(mask, 10, 10);
		expect(lines).toHaveLength(1);
		expect(lines[0]).toHaveLength(10);
	});
});

describe('simplify', () => {
	it('drops collinear points', () => {
		const line = Array.from({ length: 10 }, (_, i) => ({ x: i, y: 0 }));
		expect(simplify(line, 0.5)).toEqual([
			{ x: 0, y: 0 },
			{ x: 9, y: 0 }
		]);
	});
});

describe('simplify closed loops', () => {
	it('keeps loops that start and end on the same point', () => {
		for (const radius of [100, 150, 170, 180, 130]) {
			const loop = Array.from({ length: 41 }, (_, i) => {
				const t = Math.PI * 0.15 + (i / 40) * Math.PI * 2;
				return { x: 480 + Math.cos(t) * radius, y: 620 + Math.sin(t) * 170 };
			});
			expect(simplify(loop, 3).length).toBeGreaterThan(8);
		}
	});
});

describe('smooth', () => {
	it('turns a pixel staircase into a straight diagonal', () => {
		const stairs = Array.from({ length: 20 }, (_, i) => ({
			x: Math.ceil(i / 2),
			y: Math.floor(i / 2)
		}));
		const smoothed = smooth(stairs, 2);
		const offsets = smoothed.slice(2, -2).map((p) => p.x - p.y);
		expect(Math.max(...offsets) - Math.min(...offsets)).toBeLessThan(0.3);
		expect(smoothed[0]).toEqual(stairs[0]);
		expect(smoothed.at(-1)).toEqual(stairs.at(-1));
	});
});

describe('traceImage', () => {
	it('draws a thick stroke as a single centre line in lines mode', () => {
		const gray = canvas(40, 12, (x, y) => x >= 5 && x < 35 && y >= 5 && y <= 7);
		const lines = traceImage(gray, { ...base, mode: 'lines' });
		expect(lines).toHaveLength(1);
		const box = bounds(lines)!;
		expect(box.maxY - box.minY).toBeLessThanOrEqual(1);
		expect(box.maxX - box.minX).toBeGreaterThan(20);
	});

	it('draws the border of a filled square in outline mode', () => {
		const gray = canvas(20, 20, (x, y) => x >= 5 && x < 15 && y >= 5 && y < 15);
		const box = bounds(traceImage(gray, { ...base, mode: 'outline' }))!;
		const expected = { minX: 5, minY: 5, maxX: 14, maxY: 14 };
		for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
			expect(Math.abs(box[key] - expected[key])).toBeLessThan(1);
		}
	});

	it('hatches dark areas and leaves white paper empty', () => {
		const gray = canvas(40, 40, (x) => x < 20);
		const lines = traceImage(gray, { ...base, mode: 'hatch' });
		expect(lines.length).toBeGreaterThan(5);
		expect(bounds(lines)!.maxX).toBeLessThan(21);
	});

	it('hatches filled areas but not thin strokes when fill is on', () => {
		const fill = { spacing: 3, minWidth: 6 };
		const square = canvas(40, 40, (x, y) => x >= 5 && x < 35 && y >= 5 && y < 35);
		const plain = traceImage(square, { ...base, mode: 'outline' });
		const filled = traceImage(square, { ...base, mode: 'outline', fill });
		expect(filled.length).toBeGreaterThan(plain.length + 5);
		const bar = canvas(40, 12, (x, y) => x >= 5 && x < 35 && y >= 5 && y <= 7);
		expect(traceImage(bar, { ...base, mode: 'lines', fill })).toHaveLength(1);
	});

	it('returns nothing for a blank image', () => {
		const gray = canvas(20, 20, () => false);
		for (const mode of ['lines', 'outline', 'hatch'] as const) {
			expect(traceImage(gray, { ...base, mode })).toEqual([]);
		}
	});
});

describe('orderPaths', () => {
	it('reduces travel by visiting nearby strokes first and reversing when shorter', () => {
		const strokes = [
			[
				{ x: 100, y: 0 },
				{ x: 110, y: 0 }
			],
			[
				{ x: 20, y: 0 },
				{ x: 10, y: 0 }
			],
			[
				{ x: 50, y: 0 },
				{ x: 60, y: 0 }
			]
		];
		const ordered = orderPaths(strokes);
		expect(ordered[0][0]).toEqual({ x: 10, y: 0 });
		expect(travelDistance(ordered)).toBeLessThan(travelDistance(strokes));
	});
});
