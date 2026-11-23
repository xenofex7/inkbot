import { fonts, type Font } from '../text/layout';
import { toFont, type Handwriting } from './model';

const DB_NAME = 'inkbot-handwriting';
const STORE = 'handwriting';

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => {
			if (!request.result.objectStoreNames.contains(STORE)) {
				request.result.createObjectStore(STORE, { keyPath: 'id' });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () =>
			reject(request.error ?? new Error('Could not open handwriting storage'));
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
		request.onerror = () => reject(request.error ?? new Error('Handwriting request failed'));
	}).finally(() => db.close());
}

class HandwritingStore {
	items = $state.raw<Handwriting[]>([]);
	loaded = $state(false);
	error = $state('');

	fonts = $derived<Font[]>(this.items.map(toFont));
	allFonts = $derived<Font[]>([...fonts, ...this.fonts]);

	async load() {
		if (this.loaded) return;
		try {
			const items = (await transaction('readonly', (store) => store.getAll())) as Handwriting[];
			this.items = items.sort((a, b) => a.createdAt - b.createdAt);
			this.error = '';
		} catch (error) {
			this.error = error instanceof Error ? error.message : String(error);
		} finally {
			this.loaded = true;
		}
	}

	async save(item: Handwriting) {
		const entry = { ...item, updatedAt: Date.now() };
		await transaction('readwrite', (store) => store.put(entry));
		const exists = this.items.some((existing) => existing.id === entry.id);
		this.items = exists
			? this.items.map((existing) => (existing.id === entry.id ? entry : existing))
			: [...this.items, entry];
		return entry;
	}

	async remove(id: string) {
		await transaction('readwrite', (store) => store.delete(id));
		this.items = this.items.filter((item) => item.id !== id);
	}
}

export const handwriting = new HandwritingStore();
