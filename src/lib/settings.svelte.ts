const STORAGE_KEY = 'inkbot.settings';

type Stored = { invertY: boolean };

function load(): Stored {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return { invertY: true, ...(JSON.parse(raw) as Partial<Stored>) };
	} catch {
		return { invertY: true };
	}
	return { invertY: true };
}

class Settings {
	invertY = $state(true);

	constructor() {
		if (typeof localStorage !== 'undefined') this.invertY = load().invertY;
	}

	setInvertY(value: boolean) {
		this.invertY = value;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ invertY: value }));
		} catch {
			return;
		}
	}
}

export const settings = new Settings();
