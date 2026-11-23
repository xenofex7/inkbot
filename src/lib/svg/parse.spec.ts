import { describe, expect, it } from 'vitest';
import { bounds } from '../geometry/types';
import { extractSvg, parsePath, parseSvg, parseTransform } from './parse';

const svg = (body: string) =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;

describe('parsePath', () => {
	it('handles absolute and relative lines with close path', () => {
		expect(parsePath('M10 10 L20 10 l0 10 z')).toEqual([
			[
				{ x: 10, y: 10 },
				{ x: 20, y: 10 },
				{ x: 20, y: 20 },
				{ x: 10, y: 10 }
			]
		]);
	});

	it('treats extra coordinates after M as line segments and supports H and V', () => {
		const [line] = parsePath('M0,0 10,0 V5 H0');
		expect(line.at(-1)).toEqual({ x: 0, y: 5 });
		expect(line).toHaveLength(4);
	});

	it('splits separate subpaths into separate polylines', () => {
		expect(parsePath('M0 0 L5 0 M10 0 L15 0')).toHaveLength(2);
	});

	it('flattens curves and arcs ending at the right point', () => {
		const [curve] = parsePath('M0 0 C0 10 10 10 10 0');
		expect(curve.at(-1)).toEqual({ x: 10, y: 0 });
		const [arc] = parsePath('M0 0 A5 5 0 0 1 10 0');
		const end = arc.at(-1)!;
		expect(end.x).toBeCloseTo(10, 6);
		expect(end.y).toBeCloseTo(0, 6);
		expect(Math.min(...arc.map((p) => p.y))).toBeCloseTo(-5, 1);
	});

	it('reads compact number syntax', () => {
		expect(parsePath('M1.5.5L-2-3')[0]).toEqual([
			{ x: 1.5, y: 0.5 },
			{ x: -2, y: -3 }
		]);
	});
});

describe('parseTransform', () => {
	it('chains translate and scale left to right', () => {
		expect(parseTransform('translate(10 20) scale(2)')).toEqual([2, 0, 0, 2, 10, 20]);
	});
});

describe('parseSvg', () => {
	it('reads basic shapes', () => {
		const lines = parseSvg(
			svg(
				'<line x1="0" y1="0" x2="10" y2="0"/><rect x="5" y="5" width="10" height="10"/>' +
					'<circle cx="50" cy="50" r="10"/><polyline points="0,90 10,95 20,90"/>'
			)
		);
		expect(lines).toHaveLength(4);
		expect(bounds([lines[2]])!.minX).toBeCloseTo(40, 5);
	});

	it('applies nested group transforms', () => {
		const lines = parseSvg(
			svg(
				'<g transform="translate(10,0)"><g transform="scale(2)"><line x1="0" y1="0" x2="5" y2="0"/></g></g>'
			)
		);
		expect(lines[0]).toEqual([
			{ x: 10, y: 0 },
			{ x: 20, y: 0 }
		]);
	});

	it('ignores definitions, text and hidden elements', () => {
		const lines = parseSvg(
			svg(
				'<defs><path d="M0 0 L9 9"/></defs><text>hi</text>' +
					'<path d="M0 0 L1 1" display="none"/><path d="M0 0 L2 2"/>'
			)
		);
		expect(lines).toHaveLength(1);
	});

	it('rejects input without an svg element', () => {
		expect(() => parseSvg('<html></html>')).toThrow();
	});
});

describe('extractSvg', () => {
	it('pulls the svg out of a chatty answer with code fences', () => {
		const text =
			'Here you go:\n```svg\n<svg viewBox="0 0 10 10"><line x1="0" y1="0" x2="1" y2="1"/></svg>\n```';
		expect(extractSvg(text)).toBe(
			'<svg viewBox="0 0 10 10"><line x1="0" y1="0" x2="1" y2="1"/></svg>'
		);
	});
});
