import type { Point, Polyline } from '../geometry/types';
import type { Gray } from './trace';

const MAX_POINTS = 4000;
const OPT_PASSES = 4;
const OPT_BUDGET_MS = 1500;
const WHITE = 245;
const CONTRAST = 1.6;

function random(seed: number) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function stipple(gray: Gray, spacing: number): Point[] {
	const { width, height, data } = gray;
	const cells = (width / spacing) * (height / spacing);
	const cell = cells > MAX_POINTS * 3 ? spacing * Math.sqrt(cells / (MAX_POINTS * 3)) : spacing;
	const next = random(1);
	const points: Point[] = [];
	for (let y = 0; y < height; y += cell) {
		for (let x = 0; x < width; x += cell) {
			const px = Math.min(width - 1, x + next() * cell);
			const py = Math.min(height - 1, y + next() * cell);
			const value = data[Math.floor(py) * width + Math.floor(px)];
			if (value >= WHITE) continue;
			if (next() < (1 - value / 255) ** CONTRAST) points.push({ x: px, y: py });
		}
	}
	return points.slice(0, MAX_POINTS);
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function nearestNeighbour(points: Point[]): Point[] {
	if (points.length === 0) return [];
	const left = points.slice();
	let current = left.reduce((best, p) => (p.x + p.y < best.x + best.y ? p : best));
	left.splice(left.indexOf(current), 1);
	const route = [current];
	while (left.length > 0) {
		let bestIndex = 0;
		let bestDistance = Infinity;
		for (let i = 0; i < left.length; i++) {
			const dx = left[i].x - current.x;
			const dy = left[i].y - current.y;
			const d = dx * dx + dy * dy;
			if (d < bestDistance) {
				bestDistance = d;
				bestIndex = i;
			}
		}
		current = left[bestIndex];
		left[bestIndex] = left[left.length - 1];
		left.pop();
		route.push(current);
	}
	return route;
}

export function twoOpt(route: Point[]): Point[] {
	const n = route.length;
	const deadline = performance.now() + OPT_BUDGET_MS;
	for (let pass = 0; pass < OPT_PASSES; pass++) {
		let improved = false;
		for (let i = 0; i < n - 2; i++) {
			if (performance.now() > deadline) return route;
			for (let j = i + 2; j < n - 1; j++) {
				const before = dist(route[i], route[i + 1]) + dist(route[j], route[j + 1]);
				const after = dist(route[i], route[j]) + dist(route[i + 1], route[j + 1]);
				if (after < before - 1e-9) {
					let a = i + 1;
					let b = j;
					while (a < b) {
						[route[a], route[b]] = [route[b], route[a]];
						a++;
						b--;
					}
					improved = true;
				}
			}
		}
		if (!improved) break;
	}
	return route;
}

export function singleLine(gray: Gray, spacing: number): Polyline[] {
	const route = twoOpt(nearestNeighbour(stipple(gray, spacing)));
	return route.length > 1 ? [route] : [];
}
