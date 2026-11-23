import { PAPER_FORMATS, sheetSize, type Orientation } from './geometry/paper';
import { DEFAULT_AXES, isAxes, toMachine, type Axes, type Point } from './geometry/types';
import { VGX4 } from './grbl/vgx4';

const STORAGE_KEY = 'inkbot.settings';

export type Travel = { width: number; height: number };

type Stored = {
	axes: Axes;
	axesConfirmed: boolean;
	travel: Travel | null;
	corner: Point | null;
	penDownS: number;
	formatId: string;
	orientation: Orientation;
	margin: number;
};

const DEFAULTS: Stored = {
	axes: DEFAULT_AXES,
	axesConfirmed: false,
	travel: null,
	corner: null,
	penDownS: VGX4.penDownS,
	formatId: 'a6',
	orientation: 'landscape',
	margin: 10
};

function load(): Stored {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return DEFAULTS;
		const stored = JSON.parse(raw) as Partial<Stored> & { invertY?: boolean };
		const axes = isAxes(stored.axes)
			? stored.axes
			: stored.invertY === false
				? ([1, 0, 0, 1] as Axes)
				: DEFAULT_AXES;
		return { ...DEFAULTS, ...stored, axes };
	} catch {
		return DEFAULTS;
	}
}

class Settings {
	axes = $state<Axes>(DEFAULTS.axes);
	axesConfirmed = $state(DEFAULTS.axesConfirmed);
	travel = $state<Travel | null>(DEFAULTS.travel);
	corner = $state<Point | null>(DEFAULTS.corner);
	penDownS = $state(DEFAULTS.penDownS);
	formatId = $state(DEFAULTS.formatId);
	orientation = $state<Orientation>(DEFAULTS.orientation);
	margin = $state(DEFAULTS.margin);

	sheet = $derived(
		sheetSize(
			PAPER_FORMATS.find((f) => f.id === this.formatId) ?? PAPER_FORMATS[0],
			this.orientation
		)
	);

	defaultTravel = $derived.by((): Travel => {
		const alongX = (v: { x: number; y: number }) =>
			Math.abs(v.x) > 0 ? VGX4.areaWidth : VGX4.areaHeight;
		return {
			width: alongX(toMachine({ x: 1, y: 0 }, this.axes)),
			height: alongX(toMachine({ x: 0, y: 1 }, this.axes))
		};
	});

	area = $derived(this.travel ?? this.defaultTravel);

	constructor() {
		if (typeof localStorage === 'undefined') return;
		Object.assign(this, load());
		$effect.root(() => {
			$effect(() => {
				const snapshot: Stored = {
					axes: $state.snapshot(this.axes),
					axesConfirmed: this.axesConfirmed,
					travel: $state.snapshot(this.travel),
					corner: $state.snapshot(this.corner),
					penDownS: this.penDownS,
					formatId: this.formatId,
					orientation: this.orientation,
					margin: this.margin
				};
				try {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
				} catch {
					return;
				}
			});
		});
	}
}

export const settings = new Settings();
