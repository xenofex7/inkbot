import { bounds, type Polyline } from '../geometry/types';

export type Placement = { x: number; y: number; scale: number };

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

export function place(shape: Shape, placement: Placement): Polyline[] {
	const { x, y, scale } = placement;
	return shape.lines.map((line) => line.map((p) => ({ x: x + p.x * scale, y: y + p.y * scale })));
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
	const largest = Math.max(shape.width, shape.height);
	if (largest === 0) return placement;
	const scaleX = shape.width > 0 ? (corner.x - placement.x) / shape.width : 0;
	const scaleY = shape.height > 0 ? (corner.y - placement.y) / shape.height : 0;
	const scale = Math.max(scaleX, scaleY, minSize / largest);
	return { ...placement, scale };
}
