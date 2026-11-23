import type { Point, Polyline } from '../geometry/types';
import { orient } from '../geometry/types';
import { plotter } from '../serial/plotter.svelte';

const STORAGE_KEY = 'inkbot.positions';

export type SavedPosition = { id: string; name: string; x: number; y: number };
export type Area = { minX: number; minY: number; maxX: number; maxY: number };

type Stored = { parkDefined: boolean; area?: Area; positions: SavedPosition[] };

function load(): Stored {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const stored = raw ? (JSON.parse(raw) as Partial<Stored>) : {};
		return { parkDefined: false, positions: [], ...stored };
	} catch {
		return { parkDefined: false, positions: [] };
	}
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

class Positions {
	parkDefined = $state(false);
	area = $state<Area | undefined>();
	positions = $state<SavedPosition[]>([]);
	corner = $state<Point | undefined>();
	park = $state<Point | undefined>();

	#target: Point | undefined;

	ready = $derived(this.park !== undefined && plotter.connection === 'connected');

	constructor() {
		if (typeof localStorage === 'undefined') return;
		Object.assign(this, load());
		$effect.root(() => {
			$effect(() => {
				const snapshot: Stored = {
					parkDefined: this.parkDefined,
					area: $state.snapshot(this.area),
					positions: $state.snapshot(this.positions)
				};
				try {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
				} catch {
					return;
				}
			});
			$effect(() => {
				void plotter.resets;
				void plotter.connection;
				this.park = undefined;
				this.#target = undefined;
			});
		});
	}

	machine(): Point | undefined {
		const mpos = plotter.status?.mpos;
		return mpos ? { x: mpos.x, y: mpos.y } : undefined;
	}

	current(): Point | undefined {
		const mpos = this.machine();
		return mpos && this.park ? { x: mpos.x - this.park.x, y: mpos.y - this.park.y } : undefined;
	}

	confirmPark() {
		this.park = this.machine();
		this.#target = undefined;
	}

	setPark() {
		const here = this.current();
		const mpos = this.machine();
		if (!mpos) return;
		if (here) {
			const shift = (p: { x: number; y: number }) => ({ x: p.x - here.x, y: p.y - here.y });
			this.positions = this.positions.map((p) => ({ ...p, ...shift(p) }));
			if (this.area) {
				const a = shift({ x: this.area.minX, y: this.area.minY });
				const b = shift({ x: this.area.maxX, y: this.area.maxY });
				this.area = { minX: a.x, minY: a.y, maxX: b.x, maxY: b.y };
			}
		}
		this.park = mpos;
		this.parkDefined = true;
	}

	setCorner() {
		const here = this.current();
		if (!here) return;
		if (!this.corner) {
			this.corner = here;
			return;
		}
		this.area = {
			minX: Math.min(this.corner.x, here.x),
			minY: Math.min(this.corner.y, here.y),
			maxX: Math.max(this.corner.x, here.x),
			maxY: Math.max(this.corner.y, here.y)
		};
		this.corner = undefined;
	}

	clearArea() {
		this.area = undefined;
		this.corner = undefined;
	}

	save(name: string) {
		const here = this.current();
		if (!here) return;
		this.positions = [...this.positions, { id: crypto.randomUUID(), name, ...here }];
	}

	remove(id: string) {
		this.positions = this.positions.filter((p) => p.id !== id);
	}

	toMachine(point: Point): Point | undefined {
		return this.park ? { x: this.park.x + point.x, y: this.park.y + point.y } : undefined;
	}

	limit(target: Point): Point {
		if (!this.ready || !this.area || !this.park) return target;
		return {
			x: clamp(target.x, this.park.x + this.area.minX, this.park.x + this.area.maxX),
			y: clamp(target.y, this.park.y + this.area.minY, this.park.y + this.area.maxY)
		};
	}

	jogTarget(delta: Point): Point | undefined {
		const base = plotter.busy && this.#target ? this.#target : this.machine();
		if (!base) return undefined;
		const target = this.limit({ x: base.x + delta.x, y: base.y + delta.y });
		this.#target = target;
		return target;
	}

	outside(polylines: Polyline[], invertY: boolean): boolean {
		if (!this.ready || !this.area || !this.park) return false;
		const { x: wx, y: wy } = plotter.wco;
		const { minX, minY, maxX, maxY } = this.area;
		return polylines.some((line) =>
			line.some((p) => {
				const work = orient(p, invertY);
				const x = wx + work.x - this.park!.x;
				const y = wy + work.y - this.park!.y;
				return x < minX - 0.01 || x > maxX + 0.01 || y < minY - 0.01 || y > maxY + 0.01;
			})
		);
	}
}

export const positions = new Positions();
