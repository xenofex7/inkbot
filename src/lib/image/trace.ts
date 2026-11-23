import type { Point, Polyline } from '../geometry/types';

export type Gray = { width: number; height: number; data: Uint8ClampedArray };

export type TraceMode = 'lines' | 'outline' | 'hatch';

export type TraceOptions = {
	mode: TraceMode;
	threshold: number;
	hatchSpacing: number;
	simplify: number;
	minLength: number;
	fill?: { spacing: number; minWidth: number };
};

export function grayFromRgba(rgba: Uint8ClampedArray, width: number, height: number): Gray {
	const data = new Uint8ClampedArray(width * height);
	for (let i = 0; i < data.length; i++) {
		const r = rgba[i * 4];
		const g = rgba[i * 4 + 1];
		const b = rgba[i * 4 + 2];
		const a = rgba[i * 4 + 3] / 255;
		data[i] = (0.299 * r + 0.587 * g + 0.114 * b) * a + 255 * (1 - a);
	}
	return { width, height, data };
}

export function binarize(gray: Gray, threshold: number): Uint8Array {
	const mask = new Uint8Array(gray.width * gray.height);
	for (let i = 0; i < mask.length; i++) mask[i] = gray.data[i] < threshold ? 1 : 0;
	return mask;
}

export function thin(input: Uint8Array, width: number, height: number): Uint8Array {
	const mask = input.slice();
	const at = (x: number, y: number) =>
		x < 0 || y < 0 || x >= width || y >= height ? 0 : mask[y * width + x];
	let changed = true;
	while (changed) {
		changed = false;
		for (const pass of [0, 1]) {
			const remove: number[] = [];
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					if (!mask[y * width + x]) continue;
					const p = [
						at(x, y - 1),
						at(x + 1, y - 1),
						at(x + 1, y),
						at(x + 1, y + 1),
						at(x, y + 1),
						at(x - 1, y + 1),
						at(x - 1, y),
						at(x - 1, y - 1)
					];
					const neighbours = p.reduce((sum, v) => sum + v, 0);
					if (neighbours < 2 || neighbours > 6) continue;
					let transitions = 0;
					for (let i = 0; i < 8; i++) if (p[i] === 0 && p[(i + 1) % 8] === 1) transitions++;
					if (transitions !== 1) continue;
					const [n, , e, , s, , w] = p;
					if (pass === 0 && (n * e * s !== 0 || e * s * w !== 0)) continue;
					if (pass === 1 && (n * e * w !== 0 || n * s * w !== 0)) continue;
					remove.push(y * width + x);
				}
			}
			for (const index of remove) mask[index] = 0;
			if (remove.length) changed = true;
		}
	}
	return mask;
}

export function outline(mask: Uint8Array, width: number, height: number): Uint8Array {
	const edge = new Uint8Array(mask.length);
	const at = (x: number, y: number) =>
		x < 0 || y < 0 || x >= width || y >= height ? 0 : mask[y * width + x];
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (!at(x, y)) continue;
			if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)) {
				edge[y * width + x] = 1;
			}
		}
	}
	return edge;
}

const NEIGHBOURS = [
	[1, 0],
	[0, 1],
	[-1, 0],
	[0, -1],
	[1, 1],
	[-1, 1],
	[-1, -1],
	[1, -1]
];

export function tracePixels(mask: Uint8Array, width: number, height: number): Polyline[] {
	const visited = new Uint8Array(mask.length);
	const ink = (x: number, y: number) =>
		x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === 1;
	const degree = (x: number, y: number) =>
		NEIGHBOURS.reduce((sum, [dx, dy]) => sum + (ink(x + dx, y + dy) ? 1 : 0), 0);

	const walk = (startX: number, startY: number): Polyline => {
		const line: Point[] = [];
		for (const [dx, dy] of NEIGHBOURS) {
			const nx = startX + dx;
			const ny = startY + dy;
			if (ink(nx, ny) && visited[ny * width + nx]) {
				line.push({ x: nx, y: ny });
				break;
			}
		}
		let x = startX;
		let y = startY;
		for (;;) {
			visited[y * width + x] = 1;
			line.push({ x, y });
			const next = NEIGHBOURS.map(([dx, dy]) => [x + dx, y + dy]).find(
				([nx, ny]) => ink(nx, ny) && !visited[ny * width + nx]
			);
			if (!next) break;
			[x, y] = next;
		}
		return line;
	};

	const lines: Polyline[] = [];
	for (const endpointsOnly of [true, false]) {
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				if (!ink(x, y) || visited[y * width + x]) continue;
				if (endpointsOnly && degree(x, y) !== 1) continue;
				lines.push(walk(x, y));
			}
		}
	}
	return lines;
}

function perpendicular(p: Point, a: Point, b: Point) {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const length = Math.hypot(dx, dy);
	if (length < 1e-6) return Math.hypot(p.x - a.x, p.y - a.y);
	return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / length;
}

export function smooth(line: Polyline, radius: number): Polyline {
	if (line.length < 3 || radius <= 0) return line;
	const last = line.length - 1;
	const closed = Math.hypot(line[0].x - line[last].x, line[0].y - line[last].y) <= 1.5;
	const ring = closed && line[0].x === line[last].x && line[0].y === line[last].y;
	const points = ring ? line.slice(0, -1) : line;
	const n = points.length;
	const result = points.map((point, i) => {
		if (!closed && (i === 0 || i === n - 1)) return point;
		let x = 0;
		let y = 0;
		let count = 0;
		for (let d = -radius; d <= radius; d++) {
			const j = closed ? (i + d + n) % n : i + d;
			if (j < 0 || j >= n) continue;
			x += points[j].x;
			y += points[j].y;
			count++;
		}
		return { x: x / count, y: y / count };
	});
	return ring ? [...result, result[0]] : result;
}

export function simplify(line: Polyline, epsilon: number): Polyline {
	if (line.length < 3 || epsilon <= 0) return line;
	let maxDistance = 0;
	let index = 0;
	for (let i = 1; i < line.length - 1; i++) {
		const d = perpendicular(line[i], line[0], line[line.length - 1]);
		if (d > maxDistance) {
			maxDistance = d;
			index = i;
		}
	}
	if (maxDistance <= epsilon) return [line[0], line[line.length - 1]];
	const left = simplify(line.slice(0, index + 1), epsilon);
	const right = simplify(line.slice(index), epsilon);
	return [...left.slice(0, -1), ...right];
}

const SMOOTH_RADIUS = 2;

const HATCH_LAYERS = [
	{ angle: 0, level: 0.82 },
	{ angle: 90, level: 0.6 },
	{ angle: 45, level: 0.4 },
	{ angle: 135, level: 0.22 }
];

function scanLines(
	width: number,
	height: number,
	spacing: number,
	angleDegrees: number,
	dark: (x: number, y: number) => boolean
): Polyline[] {
	const lines: Polyline[] = [];
	const diagonal = Math.hypot(width, height);
	const cx = width / 2;
	const cy = height / 2;
	const angle = (angleDegrees * Math.PI) / 180;
	const dir = { x: Math.cos(angle), y: Math.sin(angle) };
	const normal = { x: -dir.y, y: dir.x };
	let row = 0;
	for (let offset = -diagonal / 2; offset <= diagonal / 2; offset += spacing, row++) {
		let current: Point[] = [];
		const samples: Point[] = [];
		for (let t = -diagonal / 2; t <= diagonal / 2; t += 0.5) {
			samples.push({
				x: cx + normal.x * offset + dir.x * t,
				y: cy + normal.y * offset + dir.y * t
			});
		}
		if (row % 2) samples.reverse();
		for (const p of samples) {
			const x = Math.floor(p.x);
			const y = Math.floor(p.y);
			if (x >= 0 && y >= 0 && x < width && y < height && dark(x, y)) {
				current.push(p);
			} else if (current.length) {
				lines.push([current[0], current[current.length - 1]]);
				current = [];
			}
		}
		if (current.length) lines.push([current[0], current[current.length - 1]]);
	}
	return lines;
}

export function hatch(gray: Gray, spacing: number, threshold: number): Polyline[] {
	const { width, height, data } = gray;
	return HATCH_LAYERS.flatMap((layer) =>
		scanLines(
			width,
			height,
			spacing,
			layer.angle,
			(x, y) => data[y * width + x] < threshold * layer.level
		)
	);
}

function morph(mask: Uint8Array, width: number, height: number, radius: number, grow: boolean) {
	const pass = (input: Uint8Array, horizontal: boolean) => {
		const output = new Uint8Array(input.length);
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				let value = grow ? 0 : 1;
				for (let d = -radius; d <= radius; d++) {
					const nx = horizontal ? x + d : x;
					const ny = horizontal ? y : y + d;
					const inside = nx >= 0 && ny >= 0 && nx < width && ny < height;
					const v = inside ? input[ny * width + nx] : 0;
					value = grow ? Math.max(value, v) : Math.min(value, v);
				}
				output[y * width + x] = value;
			}
		}
		return output;
	};
	return pass(pass(mask, true), false);
}

export function erode(mask: Uint8Array, width: number, height: number, radius: number) {
	return radius > 0 ? morph(mask, width, height, radius, false) : mask;
}

export function dilate(mask: Uint8Array, width: number, height: number, radius: number) {
	return radius > 0 ? morph(mask, width, height, radius, true) : mask;
}

function length(line: Polyline) {
	let total = 0;
	for (let i = 1; i < line.length; i++) {
		total += Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y);
	}
	return total;
}

export function traceImage(gray: Gray, options: TraceOptions): Polyline[] {
	const { width, height } = gray;
	const trace = (pixels: Uint8Array) =>
		tracePixels(pixels, width, height).map((line) =>
			simplify(smooth(line, SMOOTH_RADIUS), options.simplify)
		);
	let lines: Polyline[];
	if (options.mode === 'hatch') {
		lines = hatch(gray, options.hatchSpacing, options.threshold);
	} else if (!options.fill) {
		const mask = binarize(gray, options.threshold);
		lines = trace(
			options.mode === 'lines' ? thin(mask, width, height) : outline(mask, width, height)
		);
	} else {
		const mask = binarize(gray, options.threshold);
		const radius = Math.max(1, Math.round(options.fill.minWidth / 2));
		const fills = dilate(erode(mask, width, height, radius), width, height, radius);
		const strokes = mask.map((v, i) => (v && !fills[i] ? 1 : 0));
		const inner = erode(fills, width, height, 1);
		lines = [
			...trace(
				options.mode === 'lines' ? thin(strokes, width, height) : outline(strokes, width, height)
			),
			...trace(outline(fills, width, height)),
			...scanLines(width, height, options.fill.spacing, 45, (x, y) => inner[y * width + x] === 1)
		];
	}
	return lines.filter((line) => line.length > 1 && length(line) >= options.minLength);
}
