import { gallery, type GalleryItem } from './gallery/store.svelte';
import { handwriting } from './handwriting/store.svelte';
import { parseHandwriting, type Handwriting } from './handwriting/model';

const FORMAT = 'inkbot-backup';
const KEYS = { settings: 'inkbot.settings', ai: 'inkbot.ai', locale: 'inkbot.locale' } as const;

type StoredSource = { kind: 'image' | 'svg'; name: string; dataUrl: string };
type StoredItem = Omit<GalleryItem, 'source'> & { source?: StoredSource };

export type Backup = {
	format: typeof FORMAT;
	version: 1;
	createdAt: number;
	settings: unknown;
	ai: unknown;
	locale: string | null;
	gallery: StoredItem[];
	handwriting: Handwriting[];
};

function readJson(key: string): unknown {
	const raw = localStorage.getItem(key);
	return raw ? (JSON.parse(raw) as unknown) : null;
}

function toDataUrl(blob: Blob) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
		reader.readAsDataURL(blob);
	});
}

export function withoutApiKey(ai: unknown) {
	if (typeof ai !== 'object' || ai === null) return ai;
	const copy = { ...(ai as Record<string, unknown>) };
	delete copy.apiKey;
	return copy;
}

export async function createBackup(): Promise<string> {
	await Promise.all([gallery.load(), handwriting.load()]);
	const items: StoredItem[] = await Promise.all(
		gallery.items.map(async ({ source, ...item }) => ({
			...$state.snapshot(item),
			source: source
				? { kind: source.kind, name: source.name, dataUrl: await toDataUrl(source.blob) }
				: undefined
		}))
	);
	const backup: Backup = {
		format: FORMAT,
		version: 1,
		createdAt: Date.now(),
		settings: readJson(KEYS.settings),
		ai: withoutApiKey(readJson(KEYS.ai)),
		locale: localStorage.getItem(KEYS.locale),
		gallery: items,
		handwriting: handwriting.items.map((item) => $state.snapshot(item))
	};
	return JSON.stringify(backup);
}

export async function restoreBackup(text: string) {
	const backup = JSON.parse(text) as Partial<Backup>;
	if (backup.format !== FORMAT) throw new Error('Not an inkbot backup file');
	if (backup.settings) localStorage.setItem(KEYS.settings, JSON.stringify(backup.settings));
	if (backup.ai && typeof backup.ai === 'object') {
		const apiKey = (readJson(KEYS.ai) as { apiKey?: string } | null)?.apiKey ?? '';
		localStorage.setItem(KEYS.ai, JSON.stringify({ ...backup.ai, apiKey }));
	}
	if (backup.locale) localStorage.setItem(KEYS.locale, backup.locale);
	const items: GalleryItem[] = await Promise.all(
		(backup.gallery ?? []).map(async ({ source, ...item }) => ({
			...item,
			source: source
				? {
						kind: source.kind,
						name: source.name,
						blob: await (await fetch(source.dataUrl)).blob()
					}
				: undefined
		}))
	);
	await gallery.restore(items);
	for (const item of backup.handwriting ?? []) await handwriting.save(parseHandwriting(item));
}
