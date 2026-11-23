import type { Point } from '../geometry/types';
import { simplify } from '../image/trace';
import { fonts, type Font, type Glyph } from '../text/layout';

export type Handwriting = {
	id: string;
	name: string;
	createdAt: number;
	updatedAt: number;
	glyphs: Record<string, Glyph[]>;
};

export const CHARSET = [
	...'abcdefghijklmnopqrstuvwxyz',
	...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
	...'äöüÄÖÜ',
	...'0123456789',
	...'.,:;!?-\'"()&@+/'
];

export const MAX_VARIANTS = 3;
export const PAD = { size: 1000, ascent: 800, xHeight: 450, capHeight: 700 };

const BEARING = 40;
const SPACE_WIDTH = 320;
const FALLBACK_FONT_ID = 'hershey-script';
const FILE_FORMAT = 'inkbot-handwriting';

export function glyphFromStrokes(strokes: Point[][]): Glyph | undefined {
	const lines = strokes
		.filter((stroke) => stroke.length > 0)
		.map((stroke) =>
			stroke.length === 1 ? [stroke[0], { x: stroke[0].x + 4, y: stroke[0].y }] : stroke
		)
		.map((stroke) => simplify(stroke, 3).map((p) => ({ x: p.x, y: PAD.ascent - p.y })));
	if (lines.length === 0) return undefined;
	const xs = lines.flat().map((p) => p.x);
	const minX = Math.min(...xs);
	const width = Math.max(...xs) - minX;
	return {
		a: Math.round(width + 2 * BEARING),
		p: lines.map((line) => line.flatMap((p) => [Math.round(p.x - minX + BEARING), Math.round(p.y)]))
	};
}

export function glyphStrokes(glyph: Glyph): Point[][] {
	const offset = (PAD.size - glyph.a) / 2;
	return glyph.p.map((stroke) => {
		const points: Point[] = [];
		for (let i = 0; i < stroke.length; i += 2) {
			points.push({ x: stroke[i] + offset, y: PAD.ascent - stroke[i + 1] });
		}
		return points;
	});
}

export function toFont(handwriting: Handwriting): Font {
	const fallback = fonts.find((font) => font.id === FALLBACK_FONT_ID) ?? fonts[0];
	const variants = Object.fromEntries(
		Object.entries(handwriting.glyphs).filter(([, list]) => list.length > 0)
	);
	const own = Object.fromEntries(Object.entries(variants).map(([char, list]) => [char, list[0]]));
	return {
		id: handwriting.id,
		name: handwriting.name,
		license: '',
		unitsPerEm: 1000,
		ascent: PAD.ascent,
		descent: PAD.ascent - PAD.size,
		glyphs: { ...fallback.glyphs, ...own, ' ': { a: SPACE_WIDTH, p: [] } },
		variants
	};
}

export function toFile(handwritings: Handwriting[]) {
	return JSON.stringify({ format: FILE_FORMAT, version: 1, handwritings });
}

function isGlyph(value: unknown): value is Glyph {
	if (typeof value !== 'object' || value === null) return false;
	const glyph = value as Glyph;
	return (
		typeof glyph.a === 'number' &&
		Array.isArray(glyph.p) &&
		glyph.p.every((stroke) => Array.isArray(stroke) && stroke.every((n) => typeof n === 'number'))
	);
}

export function parseHandwriting(item: Partial<Handwriting>): Handwriting {
	if (typeof item.id !== 'string') throw new Error('Not an inkbot handwriting file');
	const glyphs = Object.fromEntries(
		Object.entries(item.glyphs ?? {}).map(([char, list]) => [
			char,
			Array.isArray(list) ? list.filter(isGlyph).slice(0, MAX_VARIANTS) : []
		])
	);
	return {
		id: item.id,
		name: typeof item.name === 'string' && item.name.trim() ? item.name : 'Handwriting',
		createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
		updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
		glyphs
	};
}

export function fromFile(text: string): Handwriting[] {
	const data = JSON.parse(text) as {
		format?: string;
		handwriting?: Partial<Handwriting>;
		handwritings?: Partial<Handwriting>[];
	};
	const items = data.handwritings ?? (data.handwriting ? [data.handwriting] : []);
	if (data.format !== FILE_FORMAT || !Array.isArray(items) || items.length === 0) {
		throw new Error('Not an inkbot handwriting file');
	}
	return items.map(parseHandwriting);
}
