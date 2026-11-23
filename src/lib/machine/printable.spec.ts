import { describe, expect, it } from 'vitest';
import { positions } from './positions.svelte';
import { settings } from '../settings.svelte';

describe('printable area', () => {
	it('maps the travel area onto the sheet for the rotated setup', () => {
		settings.axes = [0, -1, -1, 0];
		settings.travel = { width: 190, height: 280 };
		settings.corner = { x: -5, y: -5 };
		expect(positions.printable).toEqual({ minX: -5, maxX: 185, minY: -5, maxY: 275 });
	});

	it('flags drawings that reach outside the area without a connection', () => {
		const inside = [
			[
				{ x: 0, y: 0 },
				{ x: 180, y: 270 }
			]
		];
		const outside = [
			[
				{ x: 0, y: 0 },
				{ x: 200, y: 10 }
			]
		];
		expect(positions.outside(inside)).toBe(false);
		expect(positions.outside(outside)).toBe(true);
	});

	it('shows nothing until the sheet corner is known', () => {
		settings.corner = null;
		expect(positions.printable).toBeUndefined();
	});
});
