export type Point = { x: number; y: number };

export type Polyline = Point[];

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export function bounds(polylines: Polyline[]): Bounds | undefined {
	const points = polylines.flat();
	if (points.length === 0) return undefined;
	return {
		minX: Math.min(...points.map((p) => p.x)),
		minY: Math.min(...points.map((p) => p.y)),
		maxX: Math.max(...points.map((p) => p.x)),
		maxY: Math.max(...points.map((p) => p.y))
	};
}

export function translate(polylines: Polyline[], dx: number, dy: number): Polyline[] {
	return polylines.map((line) => line.map((p) => ({ x: p.x + dx, y: p.y + dy })));
}

export function pathLength(line: Polyline) {
	let length = 0;
	for (let i = 1; i < line.length; i++) {
		length += Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y);
	}
	return length;
}

export type Axes = [number, number, number, number];

export const DEFAULT_AXES: Axes = [1, 0, 0, -1];

export function toMachine(point: Point, axes: Axes): Point {
	const [a, b, c, d] = axes;
	return { x: a * point.x + b * point.y, y: c * point.x + d * point.y };
}

export function toSheet(point: Point, axes: Axes): Point {
	const [a, b, c, d] = axes;
	return { x: a * point.x + c * point.y, y: b * point.x + d * point.y };
}

export type Direction = 'right' | 'left' | 'up' | 'down';

const DIRECTIONS: Record<Direction, Point> = {
	right: { x: 1, y: 0 },
	left: { x: -1, y: 0 },
	up: { x: 0, y: -1 },
	down: { x: 0, y: 1 }
};

export function axesFromDirections(machineX: Direction, machineY: Direction): Axes | undefined {
	const u = DIRECTIONS[machineX];
	const v = DIRECTIONS[machineY];
	if (u.x * v.x + u.y * v.y !== 0) return undefined;
	return [u.x, u.y, v.x, v.y];
}

export function isAxes(value: unknown): value is Axes {
	if (!Array.isArray(value) || value.length !== 4) return false;
	const [a, b, c, d] = value as number[];
	const valid = (n: number) => n === 0 || n === 1 || n === -1;
	return value.every((n) => typeof n === 'number' && valid(n)) && Math.abs(a * d - b * c) === 1;
}
