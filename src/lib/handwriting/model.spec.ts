import { describe, expect, it } from 'vitest';
import { fromFile, glyphFromStrokes, PAD, toFile, toFont, type Handwriting } from './model';
import { layoutText } from '../text/layout';

const stroke = [
	{ x: 300, y: PAD.ascent },
	{ x: 400, y: PAD.ascent - 300 },
	{ x: 500, y: PAD.ascent }
];

const sample = (): Handwriting => ({
	id: 'hand-1',
	name: 'Test',
	createdAt: 1,
	updatedAt: 1,
	glyphs: {
		a: [
			glyphFromStrokes([stroke])!,
			glyphFromStrokes([stroke.map((p) => ({ ...p, x: p.x + 50 }))])!
		]
	}
});

describe('glyphFromStrokes', () => {
	it('moves the glyph to the left bearing and flips y to font units', () => {
		const glyph = glyphFromStrokes([stroke])!;
		expect(glyph.p[0].slice(0, 4)).toEqual([40, 0, 140, 300]);
		expect(glyph.a).toBe(280);
	});

	it('turns a tap into a short dot', () => {
		const glyph = glyphFromStrokes([[{ x: 100, y: 200 }]])!;
		expect(glyph.p[0].length).toBe(4);
	});

	it('returns nothing for an empty pad', () => {
		expect(glyphFromStrokes([])).toBeUndefined();
	});
});

describe('toFont', () => {
	it('uses own glyphs, falls back for missing ones and keeps variants', () => {
		const font = toFont(sample());
		expect(font.glyphs.a).toEqual(sample().glyphs.a[0]);
		expect(font.glyphs.b).toBeDefined();
		expect(font.variants?.a).toHaveLength(2);
	});
});

describe('handwriting files', () => {
	it('round-trips through the share file', () => {
		expect(fromFile(toFile(sample()))).toEqual(sample());
	});

	it('rejects other JSON files', () => {
		expect(() => fromFile('{"hello":1}')).toThrow();
	});
});

describe('natural variation', () => {
	it('varies repeated letters but stays the same for the same text', () => {
		const options = {
			font: toFont(sample()),
			size: 10,
			lineHeight: 1.4,
			align: 'left' as const,
			width: 500
		};
		const first = layoutText('aaaa', options);
		expect(layoutText('aaaa', options)).toEqual(first);
		const shapes = first.map((line) => {
			const startX = line[0].x;
			return line.map((p) => `${(p.x - startX).toFixed(2)},${p.y.toFixed(2)}`).join(' ');
		});
		expect(new Set(shapes).size).toBeGreaterThan(1);
	});
});
