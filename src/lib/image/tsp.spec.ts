import { describe, expect, it } from 'vitest';
import { pathLength, type Point } from '../geometry/types';
import { nearestNeighbour, singleLine, stipple, twoOpt } from './tsp';
import type { Gray } from './trace';

const gradient = (): Gray => {
	const width = 100;
	const height = 60;
	const data = new Uint8ClampedArray(width * height);
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) data[y * width + x] = (x / width) * 255;
	return { width, height, data };
};

describe('stipple', () => {
	it('puts more points into dark areas and none into white', () => {
		const points = stipple(gradient(), 2);
		const dark = points.filter((p) => p.x < 30).length;
		const light = points.filter((p) => p.x > 70).length;
		expect(dark).toBeGreaterThan(light * 3);
		expect(points.every((p) => p.x < 97)).toBe(true);
	});
});

describe('route', () => {
	it('visits every point once and 2-opt removes crossings', () => {
		const points: Point[] = Array.from({ length: 60 }, (_, i) => ({
			x: Math.cos(i * 2.4) * 40 + 50,
			y: Math.sin(i * 1.7) * 30 + 40
		}));
		const route = nearestNeighbour(points);
		expect(route).toHaveLength(60);
		expect(new Set(route).size).toBe(60);
		const before = pathLength(route);
		expect(pathLength(twoOpt(route.slice()))).toBeLessThanOrEqual(before);
	});

	it('turns an image into exactly one line', () => {
		expect(singleLine(gradient(), 3)).toHaveLength(1);
	});
});
