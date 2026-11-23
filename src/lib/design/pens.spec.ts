import { describe, expect, it } from 'vitest';
import { penForColor } from './pens';
import { parseSvgStrokes } from '../svg/parse';

describe('penForColor', () => {
	it('maps common colours to the nearest pen', () => {
		expect(penForColor('black')).toBe(1);
		expect(penForColor('#ac503a')).toBe(2);
		expect(penForColor('red')).toBe(2);
		expect(penForColor('#00f')).toBe(3);
		expect(penForColor('rgb(0, 128, 0)')).toBe(4);
		expect(penForColor('none')).toBe(1);
	});
});

describe('parseSvgStrokes', () => {
	it('reads stroke colours from attributes, styles and parent groups', () => {
		const strokes = parseSvgStrokes(
			'<svg viewBox="0 0 10 10"><line x1="0" y1="0" x2="1" y2="1"/>' +
				'<g stroke="#3d6fa8"><line x1="0" y1="0" x2="2" y2="2"/>' +
				'<line style="stroke: red" x1="0" y1="0" x2="3" y2="3"/></g></svg>'
		);
		expect(strokes.map((s) => s.color)).toEqual(['black', '#3d6fa8', 'red']);
	});
});
