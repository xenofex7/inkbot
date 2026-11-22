import type { Orientation } from './geometry/paper';
import { VGX4 } from './grbl/vgx4';

const STORAGE_KEY = 'inkbot.settings';

type Stored = {
	invertY: boolean;
	penDownS: number;
	formatId: string;
	orientation: Orientation;
	margin: number;
};

const DEFAULTS: Stored = {
	invertY: true,
	penDownS: VGX4.penDownS,
	formatId: 'a6',
	orientation: 'landscape',
	margin: 10
};

function load(): Stored {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Stored>) } : DEFAULTS;
	} catch {
		return DEFAULTS;
	}
}

class Settings {
	invertY = $state(DEFAULTS.invertY);
	penDownS = $state(DEFAULTS.penDownS);
	formatId = $state(DEFAULTS.formatId);
	orientation = $state<Orientation>(DEFAULTS.orientation);
	margin = $state(DEFAULTS.margin);

	constructor() {
		if (typeof localStorage === 'undefined') return;
		Object.assign(this, load());
		$effect.root(() => {
			$effect(() => {
				const snapshot: Stored = {
					invertY: this.invertY,
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

	setInvertY(value: boolean) {
		this.invertY = value;
	}
}

export const settings = new Settings();
