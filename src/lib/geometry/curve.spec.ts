import { describe, expect, it } from 'vitest';
import { smoothCurve } from './curve';

describe('smoothCurve', () => {
	it('passes through the original points of a gentle curve and adds points between them', () => {
		const line = Array.from({ length: 6 }, (_, i) => ({
			x: Math.cos((i * Math.PI) / 10) * 10,
			y: Math.sin((i * Math.PI) / 10) * 10
		}));
		const smooth = smoothCurve(line, 0.5);
		expect(smooth.length).toBeGreaterThan(line.length);
		for (const point of line) {
			expect(smooth.some((p) => Math.hypot(p.x - point.x, p.y - point.y) < 1e-9)).toBe(true);
		}
		for (const p of smooth) expect(Math.abs(Math.hypot(p.x, p.y) - 10)).toBeLessThan(0.1);
	});

	it('keeps sharp corners and straight edges', () => {
		const square = [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 10, y: 10 },
			{ x: 0, y: 10 }
		];
		const smooth = smoothCurve(square, 1);
		for (const p of smooth) {
			const onEdge = [p.x, p.y].some((v) => Math.abs(v) < 1e-9 || Math.abs(v - 10) < 1e-9);
			expect(onEdge).toBe(true);
		}
	});
});
