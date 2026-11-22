import type { Polyline } from '../geometry/types';
import fontData from './fonts.json';

type Glyph = { a: number; p: number[][] };

export type Font = {
	id: string;
	name: string;
	license: string;
	unitsPerEm: number;
	ascent: number;
	descent: number;
	glyphs: Record<string, Glyph>;
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

	text.split('\n').forEach((line, index) => {
		const baseline = font.ascent * scale + index * baselineStep;
		const used = lineWidth(font, line, scale);
		let x = align === 'center' ? (width - used) / 2 : align === 'right' ? width - used : 0;
		for (const char of line) {
			const glyph = glyphFor(font, char);
			if (!glyph) continue;
			for (const stroke of glyph.p) {
				const polyline: Polyline = [];
				for (let i = 0; i < stroke.length; i += 2) {
					polyline.push({ x: x + stroke[i] * scale, y: baseline - stroke[i + 1] * scale });
				}
				polylines.push(polyline);
			}
			x += glyph.a * scale;
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
