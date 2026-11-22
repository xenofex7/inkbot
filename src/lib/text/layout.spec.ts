import { describe, expect, it } from 'vitest';
import { bounds } from '../geometry/types';
import { fonts, layoutText, textBlockHeight } from './layout';

const font = fonts.find((f) => f.id === 'hershey-sans')!;
const options = { font, size: 10, lineHeight: 1.5, align: 'left' as const, width: 100 };

describe('fonts', () => {
	it('ships four fonts with umlauts and sharp s', () => {
		expect(fonts).toHaveLength(4);
		for (const f of fonts) {
			for (const char of 'äöüÄÖÜß') expect(f.glyphs[char], `${f.id} ${char}`).toBeDefined();
		}
	});
});

describe('layoutText', () => {
	it('scales glyphs to the font size in mm with y pointing down', () => {
		const box = bounds(layoutText('H', options))!;
		expect(box.maxY).toBeCloseTo(8, 1);
		expect(box.minY).toBeGreaterThan(0);
		expect(box.maxY - box.minY).toBeGreaterThan(5);
	});

	it('moves each new line down by size times line height', () => {
		const one = bounds(layoutText('H', options))!;
		const two = bounds(layoutText('H\nH', options))!;
		expect(two.maxY - one.maxY).toBeCloseTo(15, 5);
	});

	it('aligns right against the given width', () => {
		const box = bounds(layoutText('H', { ...options, align: 'right' }))!;
		expect(box.maxX).toBeLessThanOrEqual(100);
		expect(box.maxX).toBeGreaterThan(95);
	});

	it('draws nothing for spaces', () => {
		expect(layoutText('   ', options)).toEqual([]);
	});
});

describe('textBlockHeight', () => {
	it('covers ascent and descent of the first line plus line steps', () => {
		expect(textBlockHeight(1, options)).toBeCloseTo(10, 5);
		expect(textBlockHeight(3, options)).toBeCloseTo(40, 5);
	});
});
