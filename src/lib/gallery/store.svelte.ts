import type { Orientation } from '../geometry/paper';
import type { Polyline } from '../geometry/types';

export type GallerySource = { kind: 'image' | 'svg'; blob: Blob; name: string };

export type GalleryItem = {
	id: string;
	name: string;
	createdAt: number;
	formatId: string;
	orientation: Orientation;
	margin: number;
	sheet: { width: number; height: number };
	polylines: Polyline[];
	source?: GallerySource;
};

const DB_NAME = 'inkbot';
const STORE = 'drawings';

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => {
			if (!request.result.objectStoreNames.contains(STORE)) {
				request.result.createObjectStore(STORE, { keyPath: 'id' });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('Could not open the gallery'));
	});
}

async function transaction<T>(
	mode: IDBTransactionMode,
	run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
	const db = await openDb();
	return new Promise<T>((resolve, reject) => {
		const request = run(db.transaction(STORE, mode).objectStore(STORE));
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('Gallery request failed'));
	}).finally(() => db.close());
}

class Gallery {
	items = $state<GalleryItem[]>([]);
	loaded = $state(false);
	error = $state('');

	async load() {
		try {
			const items = (await transaction('readonly', (store) => store.getAll())) as GalleryItem[];
			this.items = items.sort((a, b) => b.createdAt - a.createdAt);
			this.error = '';
		} catch (error) {
			this.error = error instanceof Error ? error.message : String(error);
		} finally {
			this.loaded = true;
		}
	}

	async add(item: Omit<GalleryItem, 'id' | 'createdAt'>) {
		const entry: GalleryItem = {
			...$state.snapshot(item),
			source: item.source,
			id: crypto.randomUUID(),
			createdAt: Date.now()
		};
		await transaction('readwrite', (store) => store.put(entry));
		this.items = [entry, ...this.items];
		return entry;
	}

	async remove(id: string) {
		await transaction('readwrite', (store) => store.delete(id));
		this.items = this.items.filter((item) => item.id !== id);
	}
}

export const gallery = new Gallery();
