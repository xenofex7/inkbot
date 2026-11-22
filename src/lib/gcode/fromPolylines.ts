import { orient, pathLength, type Point, type Polyline } from '../geometry/types';
import { penDown, penUp } from '../grbl/commands';
import { VGX4 } from '../grbl/vgx4';

const JOIN_TOLERANCE = 0.05;
const RAPID_FEED = 5000;

const coord = (value: number) => (Math.round(value * 1000) / 1000).toString();
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function toGcode(polylines: Polyline[], invertY = false, feed: number = VGX4.drawFeed) {
	const xy = (p: Point) => {
		const m = orient(p, invertY);
		return `X${coord(m.x)} Y${coord(m.y)}`;
	};
	const lines = ['G21', 'G90', 'G94', ...penUp()];
	let last: Point | undefined;
	let down = false;
	for (const line of polylines) {
		if (line.length < 2) continue;
		const joined = down && last !== undefined && distance(last, line[0]) < JOIN_TOLERANCE;
		if (!joined) {
			if (down) lines.push(...penUp());
			lines.push(`G0 ${xy(line[0])}`);
			lines.push(...penDown());
			down = true;
		}
		line.slice(1).forEach((point, index) => {
			lines.push(index === 0 && !joined ? `G1 ${xy(point)} F${feed}` : `G1 ${xy(point)}`);
		});
		last = line.at(-1);
	}
	if (down) lines.push(...penUp());
	lines.push('G0 X0 Y0');
	return lines;
}

export function outsideArea(polylines: Polyline[], width: number, height: number) {
	return polylines.some((line) =>
		line.some((p) => p.x < -0.001 || p.y < -0.001 || p.x > width + 0.001 || p.y > height + 0.001)
	);
}

export function estimateSeconds(polylines: Polyline[], feed: number = VGX4.drawFeed) {
	let drawn = 0;
	let travel = 0;
	let penMoves = 0;
	let position: Point = { x: 0, y: 0 };
	for (const line of polylines) {
		if (line.length < 2) continue;
		const gap = distance(position, line[0]);
		if (gap >= JOIN_TOLERANCE || penMoves === 0) {
			travel += gap;
			penMoves += 2;
		}
		drawn += pathLength(line);
		position = line.at(-1)!;
	}
	travel += distance(position, { x: 0, y: 0 });
	return (drawn / feed + travel / RAPID_FEED) * 60 + penMoves * VGX4.penDwellSeconds;
}
