import { aiSettings } from './ai/settings.svelte';
import { createBackup } from './backup.svelte';
import { gallery } from './gallery/store.svelte';
import { handwriting } from './handwriting/store.svelte';
import { i18n } from './i18n.svelte';
import { settings } from './settings.svelte';

type Permission = 'granted' | 'denied' | 'prompt';
type FolderHandle = FileSystemDirectoryHandle & {
	queryPermission(options: { mode: 'readwrite' }): Promise<Permission>;
	requestPermission(options: { mode: 'readwrite' }): Promise<Permission>;
};
type PickerWindow = Window & {
	showDirectoryPicker?: (options: { id: string; mode: 'readwrite' }) => Promise<FolderHandle>;
};

const DB_NAME = 'inkbot-sync';
const STORE = 'handles';
const KEY = 'folder';
const FILE_NAME = 'inkbot-backup.json';
const DELAY_MS = 3000;

function request<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
	return new Promise<T>((resolve, reject) => {
		const open = indexedDB.open(DB_NAME, 1);
		open.onupgradeneeded = () => open.result.createObjectStore(STORE);
		open.onerror = () => reject(open.error ?? new Error('Could not open storage'));
		open.onsuccess = () => {
			const db = open.result;
			const req = run(db.transaction(STORE, mode).objectStore(STORE));
			req.onsuccess = () => {
				resolve(req.result);
				db.close();
			};
			req.onerror = () => {
				reject(req.error ?? new Error('Storage request failed'));
				db.close();
			};
		};
	});
}

function watched() {
	return [
		settings.invertY,
		settings.penDownS,
		settings.formatId,
		settings.orientation,
		settings.margin,
		aiSettings.provider,
		aiSettings.baseUrl,
		aiSettings.model,
		aiSettings.size,
		aiSettings.promptTemplate,
		aiSettings.drawingModel,
		aiSettings.svgTemplate,
		i18n.locale,
		gallery.items,
		handwriting.items
	];
}

class AutoBackup {
	supported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
	status = $state<'off' | 'paused' | 'active'>('off');
	folder = $state('');
	savedAt = $state<number | undefined>();
	error = $state('');

	#handle: FolderHandle | undefined;
	#timer: ReturnType<typeof setTimeout> | undefined;
	#started = false;

	async init() {
		if (!this.supported || this.#started) return;
		this.#started = true;
		const handle = (await request('readonly', (store) => store.get(KEY))) as
			FolderHandle | undefined;
		if (handle) {
			this.#handle = handle;
			this.folder = handle.name;
			this.status =
				(await handle.queryPermission({ mode: 'readwrite' })) === 'granted' ? 'active' : 'paused';
		}
		$effect.root(() => {
			$effect(() => {
				void watched();
				this.#schedule();
			});
		});
	}

	async choose() {
		const picker = (window as PickerWindow).showDirectoryPicker;
		if (!picker) return;
		try {
			const handle = await picker({ id: 'inkbot-backup', mode: 'readwrite' });
			await request('readwrite', (store) => store.put(handle, KEY));
			this.#handle = handle;
			this.folder = handle.name;
			this.status = 'active';
			await this.save();
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') return;
			this.error = error instanceof Error ? error.message : String(error);
		}
	}

	async resume() {
		if (!this.#handle) return;
		if ((await this.#handle.requestPermission({ mode: 'readwrite' })) !== 'granted') return;
		this.status = 'active';
		await this.save();
	}

	async stop() {
		await request('readwrite', (store) => store.delete(KEY));
		this.#handle = undefined;
		this.folder = '';
		this.savedAt = undefined;
		this.status = 'off';
	}

	async save() {
		if (!this.#handle || this.status !== 'active') return;
		try {
			const file = await this.#handle.getFileHandle(FILE_NAME, { create: true });
			const writable = await file.createWritable();
			await writable.write(await createBackup());
			await writable.close();
			this.savedAt = Date.now();
			this.error = '';
		} catch (error) {
			if (error instanceof DOMException && error.name === 'NotAllowedError') this.status = 'paused';
			else this.error = error instanceof Error ? error.message : String(error);
		}
	}

	#schedule() {
		if (this.status !== 'active') return;
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => void this.save(), DELAY_MS);
	}
}

export const autoBackup = new AutoBackup();
