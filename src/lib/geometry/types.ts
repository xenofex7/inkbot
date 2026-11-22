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
