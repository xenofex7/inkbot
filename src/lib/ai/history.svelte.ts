export type HistoryEntry =
	| { id: string; createdAt: number; name: string; kind: 'image'; blob: Blob }
	| { id: string; createdAt: number; name: string; kind: 'svg'; svg: string };

type NewEntry =
	{ name: string; kind: 'image'; blob: Blob } | { name: string; kind: 'svg'; svg: string };

const DB_NAME = 'inkbot-ai';
const STORE = 'history';
const LIMIT = 60;

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => {
			if (!request.result.objectStoreNames.contains(STORE)) {
				request.result.createObjectStore(STORE, { keyPath: 'id' });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('Could not open the AI history'));
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
		request.onerror = () => reject(request.error ?? new Error('AI history request failed'));
	}).finally(() => db.close());
}

class AiHistory {
	entries = $state<HistoryEntry[]>([]);
	loaded = $state(false);

	async load() {
		if (this.loaded) return;
		try {
			const entries = (await transaction('readonly', (store) => store.getAll())) as HistoryEntry[];
			this.entries = entries.sort((a, b) => b.createdAt - a.createdAt);
		} finally {
			this.loaded = true;
		}
	}

	async add(entry: NewEntry) {
		const saved = { ...entry, id: crypto.randomUUID(), createdAt: Date.now() } as HistoryEntry;
		await transaction('readwrite', (store) => store.put(saved));
		this.entries = [saved, ...this.entries];
		for (const old of this.entries.slice(LIMIT)) await this.remove(old.id);
	}

	async remove(id: string) {
		await transaction('readwrite', (store) => store.delete(id));
		this.entries = this.entries.filter((entry) => entry.id !== id);
	}
}

export const aiHistory = new AiHistory();
