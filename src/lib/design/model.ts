import { bounds, type Point, type Polyline } from '../geometry/types';

export type Rotation = 0 | 90 | 180 | 270;

export type Placement = { x: number; y: number; scale: number; rotation?: Rotation };

export type Shape = { lines: Polyline[]; width: number; height: number };

export function normalize(lines: Polyline[]): Shape {
	const box = bounds(lines);
	if (!box) return { lines: [], width: 0, height: 0 };
	return {
		lines: lines.map((line) => line.map((p) => ({ x: p.x - box.minX, y: p.y - box.minY }))),
		width: box.maxX - box.minX,
		height: box.maxY - box.minY
	};
}

export function extent(shape: Shape, rotation: Rotation = 0) {
	return rotation % 180 === 0
		? { width: shape.width, height: shape.height }
		: { width: shape.height, height: shape.width };
}

function turn(p: Point, shape: Shape, rotation: Rotation): Point {
	if (rotation === 90) return { x: shape.height - p.y, y: p.x };
	if (rotation === 180) return { x: shape.width - p.x, y: shape.height - p.y };
	if (rotation === 270) return { x: p.y, y: shape.width - p.x };
	return p;
}

export function place(shape: Shape, placement: Placement): Polyline[] {
	const { x, y, scale, rotation = 0 } = placement;
	return shape.lines.map((line) =>
		line.map((p) => {
			const q = turn(p, shape, rotation);
			return { x: x + q.x * scale, y: y + q.y * scale };
		})
	);
}

export function rotated(shape: Shape, placement: Placement): Placement {
	const rotation = (((placement.rotation ?? 0) + 90) % 360) as Rotation;
	const before = extent(shape, placement.rotation);
	const after = extent(shape, rotation);
	return {
		...placement,
		rotation,
		x: placement.x + ((before.width - after.width) * placement.scale) / 2,
		y: placement.y + ((before.height - after.height) * placement.scale) / 2
	};
}

export function centred(
	shape: Shape,
	area: { x: number; y: number; width: number; height: number },
	maxShare = 0.6
): Placement {
	const fit =
		shape.width > 0 && shape.height > 0
			? Math.min(1, (area.width * maxShare) / shape.width, (area.height * maxShare) / shape.height)
			: 1;
	return {
		scale: fit,
		x: area.x + (area.width - shape.width * fit) / 2,
		y: area.y + (area.height - shape.height * fit) / 2
	};
}

export function scaleFromCorner(
	shape: Shape,
	placement: Placement,
	corner: { x: number; y: number },
	minSize = 2
): Placement {
	const { width, height } = extent(shape, placement.rotation);
	const largest = Math.max(width, height);
	if (largest === 0) return placement;
	const scaleX = width > 0 ? (corner.x - placement.x) / width : 0;
	const scaleY = height > 0 ? (corner.y - placement.y) / height : 0;
	const scale = Math.max(scaleX, scaleY, minSize / largest);
	return { ...placement, scale };
}
