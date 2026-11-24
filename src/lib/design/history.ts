export class History<T> {
	#past: T[] = [];
	#future: T[] = [];
	#key: string | undefined;
	#time = 0;

	constructor(
		private readonly limit = 100,
		private readonly windowMs = 1000,
		private readonly now: () => number = () => performance.now()
	) {}

	get canUndo() {
		return this.#past.length > 0;
	}

	get canRedo() {
		return this.#future.length > 0;
	}

	record(current: T, key?: string) {
		const time = this.now();
		const merge = key !== undefined && key === this.#key && time - this.#time < this.windowMs;
		this.#key = key;
		this.#time = time;
		if (merge) return;
		this.#past.push(current);
		if (this.#past.length > this.limit) this.#past.shift();
		this.#future = [];
	}

	seal() {
		this.#key = undefined;
	}

	undo(current: T): T | undefined {
		const previous = this.#past.pop();
		if (previous === undefined) return undefined;
		this.#future.push(current);
		this.#key = undefined;
		return previous;
	}

	redo(current: T): T | undefined {
		const next = this.#future.pop();
		if (next === undefined) return undefined;
		this.#past.push(current);
		this.#key = undefined;
		return next;
	}
}
