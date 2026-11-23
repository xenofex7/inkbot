import { describe, expect, it } from 'vitest';
import { axesFromDirections, DEFAULT_AXES, isAxes, toMachine, toSheet } from './types';

describe('axes', () => {
	it('keeps the old invert-Y behaviour as default', () => {
		expect(toMachine({ x: 10, y: 5 }, DEFAULT_AXES)).toEqual({ x: 10, y: -5 });
	});

	it('derives the rotated and mirrored setup from the two test moves', () => {
		const axes = axesFromDirections('up', 'left')!;
		expect(axes).toEqual([0, -1, -1, 0]);
		const right = toMachine({ x: 1, y: 0 }, axes);
		const down = toMachine({ x: 0, y: 1 }, axes);
		expect([right.x + 0, right.y]).toEqual([0, -1]);
		expect([down.x, down.y + 0]).toEqual([-1, 0]);
	});

	it('maps back to the sheet for every valid setup', () => {
		const dirs = ['right', 'left', 'up', 'down'] as const;
		for (const x of dirs) {
			for (const y of dirs) {
				const axes = axesFromDirections(x, y);
				if (!axes) continue;
				expect(isAxes(axes)).toBe(true);
				const back = toSheet(toMachine({ x: 3, y: 7 }, axes), axes);
				expect(back.x).toBeCloseTo(3);
				expect(back.y).toBeCloseTo(7);
			}
		}
	});

	it('rejects two answers along the same table axis', () => {
		expect(axesFromDirections('up', 'down')).toBeUndefined();
		expect(isAxes([1, 1, 0, 0])).toBe(false);
	});
});
