import { describe, expect, it } from 'vitest';
import { step } from './positions.svelte';

describe('jog step limit', () => {
	it('clamps moves inside the travel area at the edge', () => {
		expect(step(-5, 10, -310, 0)).toBe(0);
		expect(step(-300, -20, -310, 0)).toBe(-310);
		expect(step(-100, -5, -310, 0)).toBe(-105);
	});

	it('only lets a position outside the area move back by one step', () => {
		expect(step(50, -5, -310, 0)).toBe(45);
		expect(step(50, 5, -310, 0)).toBe(50);
		expect(step(-320, 5, -310, 0)).toBe(-315);
		expect(step(-320, -5, -310, 0)).toBe(-320);
	});

	it('keeps an axis that does not move', () => {
		expect(step(50, 0, -310, 0)).toBe(50);
	});
});
