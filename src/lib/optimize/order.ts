import type { Point, Polyline } from '../geometry/types';

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function orderPaths(polylines: Polyline[], start: Point = { x: 0, y: 0 }): Polyline[] {
	const remaining = polylines.filter((line) => line.length > 0);
	const ordered: Polyline[] = [];
	let position = start;
	while (remaining.length) {
		let best = 0;
		let reverse = false;
		let bestDistance = Infinity;
		for (let i = 0; i < remaining.length; i++) {
			const line = remaining[i];
			const toStart = distance(position, line[0]);
			const toEnd = distance(position, line[line.length - 1]);
			if (toStart < bestDistance) {
				bestDistance = toStart;
				best = i;
				reverse = false;
			}
			if (toEnd < bestDistance) {
				bestDistance = toEnd;
				best = i;
				reverse = true;
			}
		}
		const [line] = remaining.splice(best, 1);
		const next = reverse ? [...line].reverse() : line;
		ordered.push(next);
		position = next[next.length - 1];
	}
	return ordered;
}

export function travelDistance(polylines: Polyline[], start: Point = { x: 0, y: 0 }) {
	let total = 0;
	let position = start;
	for (const line of polylines) {
		total += distance(position, line[0]);
		position = line[line.length - 1];
	}
	return total;
}
