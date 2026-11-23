import { toMachine, type Point, type Polyline } from '../geometry/types';
import { plotter } from '../serial/plotter.svelte';
import { settings } from '../settings.svelte';

const STORAGE_KEY = 'inkbot.positions.v2';

export type SavedPosition = { id: string; name: string; x: number; y: number };

function load(): SavedPosition[] {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as {
			positions?: SavedPosition[];
		};
		return Array.isArray(stored.positions) ? stored.positions : [];
	} catch {
		return [];
	}
}

export function step(base: number, delta: number, min: number, max: number) {
	if (delta === 0) return base;
	const next = base + delta;
	if (base > max) return delta < 0 ? Math.max(min, next) : base;
	if (base < min) return delta > 0 ? Math.min(max, next) : base;
	return Math.min(max, Math.max(min, next));
}

class Positions {
	positions = $state<SavedPosition[]>([]);
	anchor = $state<Point | undefined>();
	cornerThisSession = $state(false);

	ready = $derived(this.anchor !== undefined && settings.axesConfirmed);
	originKnown = $derived(this.cornerThisSession || (this.ready && settings.corner !== null));

	box = $derived.by(() => {
		const a = this.anchor ?? { x: 0, y: 0 };
		const far = toMachine({ x: settings.area.width, y: settings.area.height }, settings.axes);
		return {
			minX: a.x + Math.min(0, far.x),
			maxX: a.x + Math.max(0, far.x),
			minY: a.y + Math.min(0, far.y),
			maxY: a.y + Math.max(0, far.y)
		};
	});

	#target: Point | undefined;

	constructor() {
		if (typeof localStorage === 'undefined') return;
		this.positions = load();
		$effect.root(() => {
			$effect(() => {
				const snapshot = { positions: $state.snapshot(this.positions) };
				try {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
				} catch {
					return;
				}
			});
			$effect(() => {
				void plotter.resets;
				void plotter.connection;
				this.anchor = undefined;
				this.cornerThisSession = false;
				this.#target = undefined;
			});
		});
	}

	machine(): Point | undefined {
		const mpos = plotter.status?.mpos;
		return mpos ? { x: mpos.x, y: mpos.y } : undefined;
	}

	confirmAnchor(): string[] {
		const here = this.machine();
		if (!here) return [];
		this.anchor = here;
		this.#target = undefined;
		const corner = settings.corner;
		if (!corner) return [];
		const x = (here.x + corner.x).toFixed(3);
		const y = (here.y + corner.y).toFixed(3);
		return ['G92.1', `G10 L2 P1 X${x} Y${y}`];
	}

	markCorner() {
		const here = this.machine();
		this.cornerThisSession = true;
		if (here && this.anchor)
			settings.corner = { x: here.x - this.anchor.x, y: here.y - this.anchor.y };
	}

	toMachine(point: Point): Point | undefined {
		return this.anchor
			? this.limit({ x: this.anchor.x + point.x, y: this.anchor.y + point.y })
			: undefined;
	}

	save(name: string) {
		const here = this.machine();
		if (!here || !this.anchor) return;
		const point = { x: here.x - this.anchor.x, y: here.y - this.anchor.y };
		this.positions = [...this.positions, { id: crypto.randomUUID(), name, ...point }];
	}

	remove(id: string) {
		this.positions = this.positions.filter((p) => p.id !== id);
	}

	limit(target: Point): Point {
		const { minX, maxX, minY, maxY } = this.box;
		return {
			x: Math.min(maxX, Math.max(minX, target.x)),
			y: Math.min(maxY, Math.max(minY, target.y))
		};
	}

	jogTarget(delta: Point): Point | undefined {
		if (!this.ready) return undefined;
		const base = plotter.busy && this.#target ? this.#target : this.machine();
		if (!base) return undefined;
		const { minX, maxX, minY, maxY } = this.box;
		const target = { x: step(base.x, delta.x, minX, maxX), y: step(base.y, delta.y, minY, maxY) };
		this.#target = target;
		return target;
	}

	outside(polylines: Polyline[]): boolean {
		if (!this.ready) return false;
		const { minX, maxX, minY, maxY } = this.box;
		const { x: wx, y: wy } = plotter.wco;
		return polylines.some((line) =>
			line.some((p) => {
				const m = toMachine(p, settings.axes);
				const x = wx + m.x;
				const y = wy + m.y;
				return x < minX - 0.01 || x > maxX + 0.01 || y < minY - 0.01 || y > maxY + 0.01;
			})
		);
	}
}

export const positions = new Positions();
