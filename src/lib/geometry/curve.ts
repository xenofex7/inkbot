import type { Point, Polyline } from './types';

const CORNER_DEGREES = 55;
const MAX_STEPS = 8;

function turn(a: Point, b: Point, c: Point) {
	const angle1 = Math.atan2(b.y - a.y, b.x - a.x);
	const angle2 = Math.atan2(c.y - b.y, c.x - b.x);
	const delta = Math.abs(angle2 - angle1) % (2 * Math.PI);
	return ((delta > Math.PI ? 2 * Math.PI - delta : delta) * 180) / Math.PI;
}

function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
	const t2 = t * t;
	const t3 = t2 * t;
	const blend = (a: number, b: number, c: number, d: number) =>
		0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
	return { x: blend(p0.x, p1.x, p2.x, p3.x), y: blend(p0.y, p1.y, p2.y, p3.y) };
}

function splineRun(run: Polyline, step: number): Polyline {
	if (run.length < 3) return run;
	const reflect = (a: Point, b: Point) => ({ x: 2 * a.x - b.x, y: 2 * a.y - b.y });
	const result: Polyline = [run[0]];
	for (let i = 0; i < run.length - 1; i++) {
		const p0 = i > 0 ? run[i - 1] : reflect(run[0], run[1]);
		const p3 = i + 2 < run.length ? run[i + 2] : reflect(run[i + 1], run[i]);
		const length = Math.hypot(run[i + 1].x - run[i].x, run[i + 1].y - run[i].y);
		const steps = Math.min(MAX_STEPS, Math.max(1, Math.ceil(length / step)));
		for (let s = 1; s <= steps; s++) result.push(catmullRom(p0, run[i], run[i + 1], p3, s / steps));
	}
	return result;
}

export function smoothCurve(line: Polyline, step: number): Polyline {
	if (line.length < 3) return line;
	const result: Polyline = [];
	let start = 0;
	for (let i = 1; i < line.length; i++) {
		const corner = i < line.length - 1 && turn(line[i - 1], line[i], line[i + 1]) > CORNER_DEGREES;
		if (corner || i === line.length - 1) {
			const run = splineRun(line.slice(start, i + 1), step);
			result.push(...(result.length > 0 ? run.slice(1) : run));
			start = i;
		}
	}
	return result;
}
