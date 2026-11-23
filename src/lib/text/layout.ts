import type { Polyline } from '../geometry/types';
import fontData from './fonts.json';

export type Glyph = { a: number; p: number[][] };

export type Font = {
	id: string;
	name: string;
	license: string;
	unitsPerEm: number;
	ascent: number;
	descent: number;
	glyphs: Record<string, Glyph>;
	variants?: Record<string, Glyph[]>;
};

export type Align = 'left' | 'center' | 'right';

export type TextOptions = {
	font: Font;
	size: number;
	lineHeight: number;
	align: Align;
	width: number;
};

export const fonts = fontData as Font[];

const FALLBACK: Record<string, string> = {
	'’': "'",
	'‘': "'",
	'“': '"',
	'”': '"',
	'–': '-',
	'—': '-'
};

function glyphFor(font: Font, char: string): Glyph | undefined {
	return font.glyphs[char] ?? font.glyphs[FALLBACK[char] ?? ''] ?? font.glyphs['?'];
}

function seeded(text: string) {
	let seed = 2166136261;
	for (const char of text) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

type Variation = { glyph: Glyph; scale: number; angle: number; lift: number; advance: number };

function vary(font: Font, char: string, glyph: Glyph, random: () => number): Variation {
	const list = font.variants?.[char];
	if (!list) return { glyph, scale: 1, angle: 0, lift: 0, advance: 1 };
	const jitter = (amount: number) => (random() * 2 - 1) * amount;
	return {
		glyph: list[Math.floor(random() * list.length)] ?? glyph,
		scale: 1 + jitter(0.04),
		angle: jitter(0.03),
		lift: jitter(12),
		advance: 1 + jitter(0.04)
	};
}

function lineWidth(font: Font, line: string, scale: number) {
	let width = 0;
	for (const char of line) width += (glyphFor(font, char)?.a ?? 0) * scale;
	return width;
}

export function layoutText(text: string, options: TextOptions): Polyline[] {
	const { font, size, lineHeight, align, width } = options;
	const scale = size / font.unitsPerEm;
	const baselineStep = size * lineHeight;
	const polylines: Polyline[] = [];
	const random = seeded(text);

	text.split('\n').forEach((line, index) => {
		const baseline = font.ascent * scale + index * baselineStep;
		const used = lineWidth(font, line, scale);
		let x = align === 'center' ? (width - used) / 2 : align === 'right' ? width - used : 0;
		for (const char of line) {
			const base = glyphFor(font, char);
			if (!base) continue;
			const { glyph, scale: grow, angle, lift, advance } = vary(font, char, base, random);
			const cos = Math.cos(angle) * grow;
			const sin = Math.sin(angle) * grow;
			for (const stroke of glyph.p) {
				const polyline: Polyline = [];
				for (let i = 0; i < stroke.length; i += 2) {
					const gx = stroke[i];
					const gy = stroke[i + 1] + lift;
					polyline.push({
						x: x + (gx * cos - gy * sin) * scale,
						y: baseline - (gx * sin + gy * cos) * scale
					});
				}
				polylines.push(polyline);
			}
			x += glyph.a * advance * scale;
		}
	});

	return polylines;
}

export function textBlockHeight(
	lines: number,
	options: Pick<TextOptions, 'font' | 'size' | 'lineHeight'>
) {
	const { font, size, lineHeight } = options;
	const scale = size / font.unitsPerEm;
	return (font.ascent - font.descent) * scale + Math.max(0, lines - 1) * size * lineHeight;
}
