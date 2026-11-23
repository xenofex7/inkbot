import { describe, expect, it } from 'vitest';
import { homography } from '../geometry/homography';
import type { Point, Polyline } from '../geometry/types';
import type { Gray } from '../image/trace';
import { scanTemplate } from './scan';
import { MARKERS, templateCells, templatePolylines } from './template';

function render(lines: Polyline[], width: number, height: number, radius: number): Gray {
	const data = new Uint8ClampedArray(width * height).fill(235);
	const stamp = (p: Point) => {
		for (let y = Math.floor(p.y - radius); y <= p.y + radius; y++) {
			for (let x = Math.floor(p.x - radius); x <= p.x + radius; x++) {
				if (x < 0 || y < 0 || x >= width || y >= height) continue;
				if (Math.hypot(x - p.x, y - p.y) <= radius) data[y * width + x] = 30;
			}
		}
	};
	for (const line of lines) {
		for (let i = 1; i < line.length; i++) {
			const a = line[i - 1];
			const b = line[i];
			const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.5) + 1;
			for (let s = 0; s <= steps; s++) {
				stamp({ x: a.x + ((b.x - a.x) * s) / steps, y: a.y + ((b.y - a.y) * s) / steps });
			}
		}
	}
	return { width, height, data };
}

describe('homography', () => {
	it('maps the four reference points exactly', () => {
		const to = [
			{ x: 10, y: 20 },
			{ x: 300, y: 5 },
			{ x: 320, y: 240 },
			{ x: 0, y: 200 }
		];
		const map = homography(MARKERS, to);
		MARKERS.forEach((p, i) => {
			expect(map(p).x).toBeCloseTo(to[i].x, 6);
			expect(map(p).y).toBeCloseTo(to[i].y, 6);
		});
	});
});

describe('scanTemplate', () => {
	it('finds handwritten characters on a skewed photo of the template', () => {
		const cells = Object.fromEntries(templateCells().map((cell) => [cell.char, cell]));
		const inBox = (char: string, points: [number, number][]) =>
			points.map(([u, v]) => ({
				x: cells[char].x + u * cells[char].size,
				y: cells[char].y + v * cells[char].size
			}));
		const ring = Array.from({ length: 30 }, (_, i): [number, number] => {
			const t = (i / 29) * Math.PI * 2;
			return [0.45 + Math.cos(t) * 0.18, 0.62 + Math.sin(t) * 0.17];
		});
		const writing = [
			inBox('a', ring),
			inBox('a', [
				[0.63, 0.45],
				[0.63, 0.8]
			]),
			inBox('T', [
				[0.2, 0.12],
				[0.8, 0.12]
			]),
			inBox('T', [
				[0.5, 0.12],
				[0.5, 0.8]
			])
		];
		const corners = [
			{ x: 90, y: 60 },
			{ x: 1500, y: 110 },
			{ x: 1460, y: 1090 },
			{ x: 60, y: 1010 }
		];
		const toImage = homography(MARKERS, corners);
		const photo = [...templatePolylines('Test'), ...writing].map((line) => line.map(toImage));
		const glyphs = scanTemplate(render(photo, 1600, 1150, 2), corners);

		expect(Object.keys(glyphs).sort()).toEqual(['T', 'a']);
		expect(glyphs.a.p.length).toBeGreaterThanOrEqual(1);
		expect(glyphs.a.a).toBeGreaterThan(300);
	});
});
