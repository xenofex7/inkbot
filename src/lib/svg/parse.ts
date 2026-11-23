import type { Point, Polyline } from '../geometry/types';

type Matrix = [number, number, number, number, number, number];

type Element = { name: string; attrs: Record<string, string>; children: Element[] };

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const CURVE_STEPS = 16;

function multiply(m: Matrix, n: Matrix): Matrix {
	return [
		m[0] * n[0] + m[2] * n[1],
		m[1] * n[0] + m[3] * n[1],
		m[0] * n[2] + m[2] * n[3],
		m[1] * n[2] + m[3] * n[3],
		m[0] * n[4] + m[2] * n[5] + m[4],
		m[1] * n[4] + m[3] * n[5] + m[5]
	];
}

function apply(m: Matrix, p: Point): Point {
	return { x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] };
}

const numbers = (value: string) =>
	(value.match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi) ?? []).map(Number);

export function parseTransform(value: string | undefined): Matrix {
	let matrix = IDENTITY;
	if (!value) return matrix;
	for (const [, name, args] of value.matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
		const n = numbers(args);
		let next: Matrix = IDENTITY;
		if (name === 'matrix' && n.length === 6) next = n as Matrix;
		else if (name === 'translate') next = [1, 0, 0, 1, n[0] ?? 0, n[1] ?? 0];
		else if (name === 'scale') next = [n[0] ?? 1, 0, 0, n[1] ?? n[0] ?? 1, 0, 0];
		else if (name === 'rotate') {
			const a = ((n[0] ?? 0) * Math.PI) / 180;
			const [cx, cy] = [n[1] ?? 0, n[2] ?? 0];
			next = multiply(
				multiply([1, 0, 0, 1, cx, cy], [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]),
				[1, 0, 0, 1, -cx, -cy]
			);
		} else if (name === 'skewX') next = [1, 0, Math.tan(((n[0] ?? 0) * Math.PI) / 180), 1, 0, 0];
		else if (name === 'skewY') next = [1, Math.tan(((n[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0];
		matrix = multiply(matrix, next);
	}
	return matrix;
}

function parseXml(source: string): Element {
	const root: Element = { name: '#root', attrs: {}, children: [] };
	const stack = [root];
	const cleaned = source
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<\?[\s\S]*?\?>/g, '')
		.replace(/<!DOCTYPE[\s\S]*?>/gi, '')
		.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
	for (const [, closing, name, rawAttrs, selfClosing] of cleaned.matchAll(
		/<(\/?)([\w:-]+)([^>]*?)(\/?)>/g
	)) {
		if (closing) {
			if (stack.length > 1) stack.pop();
			continue;
		}
		const attrs: Record<string, string> = {};
		for (const [, key, , value] of rawAttrs.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)) {
			attrs[key] = value;
		}
		const element: Element = { name: name.replace(/^svg:/, ''), attrs, children: [] };
		stack[stack.length - 1].children.push(element);
		if (!selfClosing) stack.push(element);
	}
	return root;
}

function arcPoints(
	from: Point,
	rx: number,
	ry: number,
	rotation: number,
	largeArc: boolean,
	sweep: boolean,
	to: Point
): Point[] {
	if (rx === 0 || ry === 0) return [to];
	const phi = (rotation * Math.PI) / 180;
	const cos = Math.cos(phi);
	const sin = Math.sin(phi);
	const dx = (from.x - to.x) / 2;
	const dy = (from.y - to.y) / 2;
	const x1 = cos * dx + sin * dy;
	const y1 = -sin * dx + cos * dy;
	rx = Math.abs(rx);
	ry = Math.abs(ry);
	const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
	if (lambda > 1) {
		rx *= Math.sqrt(lambda);
		ry *= Math.sqrt(lambda);
	}
	const sign = largeArc === sweep ? -1 : 1;
	const numerator = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
	const denominator = rx * rx * y1 * y1 + ry * ry * x1 * x1;
	const factor = sign * Math.sqrt(Math.max(0, numerator / denominator));
	const cx1 = (factor * rx * y1) / ry;
	const cy1 = (-factor * ry * x1) / rx;
	const cx = cos * cx1 - sin * cy1 + (from.x + to.x) / 2;
	const cy = sin * cx1 + cos * cy1 + (from.y + to.y) / 2;
	const angle = (ux: number, uy: number, vx: number, vy: number) =>
		Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
	const start = angle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
	let delta = angle((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
	if (!sweep && delta > 0) delta -= 2 * Math.PI;
	if (sweep && delta < 0) delta += 2 * Math.PI;
	const steps = Math.max(4, Math.ceil((Math.abs(delta) / (Math.PI / 2)) * CURVE_STEPS));
	const points: Point[] = [];
	for (let i = 1; i <= steps; i++) {
		const t = start + (delta * i) / steps;
		const ex = rx * Math.cos(t);
		const ey = ry * Math.sin(t);
		points.push({ x: cos * ex - sin * ey + cx, y: sin * ex + cos * ey + cy });
	}
	return points;
}

export function parsePath(d: string): Polyline[] {
	const tokens = d.match(/[a-df-z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi) ?? [];
	const lines: Polyline[] = [];
	let current: Point[] = [];
	let point: Point = { x: 0, y: 0 };
	let start: Point = { x: 0, y: 0 };
	let control: Point | undefined;
	let command = '';
	let i = 0;
	const isCommand = (token: string | undefined) => token !== undefined && /^[a-z]$/i.test(token);
	const next = () => Number(tokens[i++]);
	const flush = () => {
		if (current.length > 1) lines.push(current);
		current = [];
	};
	const cubic = (p0: Point, p1: Point, p2: Point, p3: Point) => {
		for (let s = 1; s <= CURVE_STEPS; s++) {
			const t = s / CURVE_STEPS;
			const u = 1 - t;
			current.push({
				x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
				y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
			});
		}
	};
	while (i < tokens.length) {
		if (isCommand(tokens[i])) command = tokens[i++];
		else if (!command) break;
		const relative = command === command.toLowerCase();
		const base = relative ? point : { x: 0, y: 0 };
		const at = (x: number, y: number): Point => ({ x: base.x + x, y: base.y + y });
		switch (command.toUpperCase()) {
			case 'M': {
				flush();
				point = at(next(), next());
				start = point;
				current = [point];
				command = relative ? 'l' : 'L';
				control = undefined;
				break;
			}
			case 'L':
				point = at(next(), next());
				current.push(point);
				control = undefined;
				break;
			case 'H':
				point = { x: (relative ? point.x : 0) + next(), y: point.y };
				current.push(point);
				control = undefined;
				break;
			case 'V':
				point = { x: point.x, y: (relative ? point.y : 0) + next() };
				current.push(point);
				control = undefined;
				break;
			case 'C': {
				const c1 = at(next(), next());
				const c2 = at(next(), next());
				const end = at(next(), next());
				cubic(point, c1, c2, end);
				control = c2;
				point = end;
				break;
			}
			case 'S': {
				const c1 = control ? { x: 2 * point.x - control.x, y: 2 * point.y - control.y } : point;
				const c2 = at(next(), next());
				const end = at(next(), next());
				cubic(point, c1, c2, end);
				control = c2;
				point = end;
				break;
			}
			case 'Q':
			case 'T': {
				const q =
					command.toUpperCase() === 'Q'
						? at(next(), next())
						: control
							? { x: 2 * point.x - control.x, y: 2 * point.y - control.y }
							: point;
				const end = at(next(), next());
				const c1 = {
					x: point.x + (2 / 3) * (q.x - point.x),
					y: point.y + (2 / 3) * (q.y - point.y)
				};
				const c2 = { x: end.x + (2 / 3) * (q.x - end.x), y: end.y + (2 / 3) * (q.y - end.y) };
				cubic(point, c1, c2, end);
				control = q;
				point = end;
				break;
			}
			case 'A': {
				const rx = next();
				const ry = next();
				const rotation = next();
				const largeArc = next() !== 0;
				const sweep = next() !== 0;
				const end = at(next(), next());
				current.push(...arcPoints(point, rx, ry, rotation, largeArc, sweep, end));
				point = end;
				control = undefined;
				break;
			}
			case 'Z':
				if (current.length) current.push(start);
				point = start;
				flush();
				current = [start];
				control = undefined;
				command = '';
				break;
			default:
				i++;
		}
	}
	flush();
	return lines;
}

function ellipse(cx: number, cy: number, rx: number, ry: number): Polyline {
	const steps = Math.max(24, Math.ceil(Math.max(rx, ry) * 2));
	return Array.from({ length: steps + 1 }, (_, i) => {
		const t = (i / steps) * 2 * Math.PI;
		return { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) };
	});
}

function pointList(value: string | undefined): Point[] {
	const n = numbers(value ?? '');
	const points: Point[] = [];
	for (let i = 0; i + 1 < n.length; i += 2) points.push({ x: n[i], y: n[i + 1] });
	return points;
}

function shape(element: Element): Polyline[] {
	const a = element.attrs;
	const num = (key: string) => Number.parseFloat(a[key] ?? '0') || 0;
	switch (element.name) {
		case 'path':
			return parsePath(a.d ?? '');
		case 'line':
			return [
				[
					{ x: num('x1'), y: num('y1') },
					{ x: num('x2'), y: num('y2') }
				]
			];
		case 'polyline':
			return [pointList(a.points)];
		case 'polygon': {
			const points = pointList(a.points);
			return points.length ? [[...points, points[0]]] : [];
		}
		case 'rect': {
			const [x, y, w, h] = [num('x'), num('y'), num('width'), num('height')];
			if (w <= 0 || h <= 0) return [];
			return [
				[
					{ x, y },
					{ x: x + w, y },
					{ x: x + w, y: y + h },
					{ x, y: y + h },
					{ x, y }
				]
			];
		}
		case 'circle':
			return num('r') > 0 ? [ellipse(num('cx'), num('cy'), num('r'), num('r'))] : [];
		case 'ellipse':
			return num('rx') > 0 && num('ry') > 0
				? [ellipse(num('cx'), num('cy'), num('rx'), num('ry'))]
				: [];
		default:
			return [];
	}
}

const SKIP = new Set([
	'defs',
	'clipPath',
	'mask',
	'symbol',
	'style',
	'title',
	'desc',
	'metadata',
	'text'
]);

export type Stroke = { line: Polyline; color: string };

function strokeOf(element: Element, inherited: string) {
	const style = /(?:^|;)\s*stroke\s*:\s*([^;]+)/.exec(element.attrs.style ?? '')?.[1];
	const value = (style ?? element.attrs.stroke ?? '').trim();
	return value && value !== 'inherit' ? value : inherited;
}

export function parseSvgStrokes(source: string): Stroke[] {
	const root = parseXml(source);
	const svg = root.children.find((child) => child.name === 'svg');
	if (!svg) throw new Error('No <svg> element found.');
	const strokes: Stroke[] = [];
	const walk = (element: Element, matrix: Matrix, inherited: string) => {
		if (SKIP.has(element.name) || element.attrs.display === 'none') return;
		const own = multiply(matrix, parseTransform(element.attrs.transform));
		const color = strokeOf(element, inherited);
		for (const line of shape(element)) {
			if (line.length > 1) strokes.push({ line: line.map((p) => apply(own, p)), color });
		}
		for (const child of element.children) walk(child, own, color);
	};
	for (const child of svg.children) walk(child, IDENTITY, strokeOf(svg, 'black'));
	return strokes;
}

export function parseSvg(source: string): Polyline[] {
	return parseSvgStrokes(source).map((stroke) => stroke.line);
}

export function extractSvg(text: string): string {
	const match = /<svg[\s\S]*<\/svg>/i.exec(text);
	if (!match) throw new Error('The response contains no SVG.');
	return match[0];
}
