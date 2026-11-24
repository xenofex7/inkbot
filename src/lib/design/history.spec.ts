import { describe, expect, it } from 'vitest';
import { History } from './history';

const clock = () => {
	let time = 0;
	return { now: () => time, advance: (ms: number) => (time += ms) };
};

describe('History', () => {
	it('undoes and redoes single changes in order', () => {
		const history = new History<string>();
		let state = 'a';
		const change = (next: string) => {
			history.record(state);
			state = next;
		};
		change('b');
		change('c');
		state = history.undo(state)!;
		expect(state).toBe('b');
		state = history.undo(state)!;
		expect(state).toBe('a');
		expect(history.canUndo).toBe(false);
		state = history.redo(state)!;
		expect(state).toBe('b');
		expect(history.canRedo).toBe(true);
	});

	it('merges a gesture with the same key into one step until sealed', () => {
		const time = clock();
		const history = new History<number>(100, 1000, time.now);
		let state = 0;
		for (let i = 1; i <= 5; i++) {
			history.record(state, 'move:a');
			state = i;
			time.advance(16);
		}
		history.seal();
		history.record(state, 'move:a');
		state = 10;
		expect(history.undo(state)).toBe(5);
		expect(history.undo(5)).toBe(0);
		expect(history.canUndo).toBe(false);
	});

	it('starts a new step when the same key comes back after a pause', () => {
		const time = clock();
		const history = new History<number>(100, 1000, time.now);
		history.record(0, 'text:a');
		time.advance(1500);
		history.record(1, 'text:a');
		expect(history.undo(2)).toBe(1);
		expect(history.undo(1)).toBe(0);
	});

	it('drops the redo branch after a new change and keeps the limit', () => {
		const history = new History<number>(3);
		for (let i = 0; i < 5; i++) history.record(i);
		expect(history.undo(5)).toBe(4);
		history.record(4);
		expect(history.canRedo).toBe(false);
		let count = 0;
		let state: number | undefined = 9;
		while ((state = history.undo(state)) !== undefined) count++;
		expect(count).toBe(3);
	});
});
