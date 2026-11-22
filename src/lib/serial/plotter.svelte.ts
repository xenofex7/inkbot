import { parseLine, workPosition, type Position, type StatusReport } from '../grbl/parse';
import { REALTIME, VGX4 } from '../grbl/vgx4';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected';
export type LogEntry = { id: number; direction: 'tx' | 'rx'; text: string };

type Pending = { length: number; resolve: () => void; reject: (error: Error) => void };

const LOG_LIMIT = 300;
const GREETING_TIMEOUT_MS = 5000;

export class Plotter {
	connection = $state<ConnectionState>('disconnected');
	greeting = $state('');
	version = $state('');
	status = $state<StatusReport | undefined>();
	wco = $state<Position>({ x: 0, y: 0, z: 0 });
	alarm = $state<number | undefined>();
	lastError = $state('');
	log = $state<LogEntry[]>([]);

	position = $derived(this.status ? workPosition(this.status, this.wco) : undefined);
	penDown = $derived(this.status?.spindleOn ?? false);
	busy = $derived(this.status?.state === 'Run' || this.status?.state === 'Jog');

	#port: SerialPort | undefined;
	#reader: ReadableStreamDefaultReader<string> | undefined;
	#readDone: Promise<void> | undefined;
	#writer: WritableStreamDefaultWriter<Uint8Array> | undefined;
	#encoder = new TextEncoder();
	#pending: Pending[] = [];
	#spaceWaiters: (() => void)[] = [];
	#greetingWaiter: (() => void) | undefined;
	#poll: ReturnType<typeof setInterval> | undefined;
	#queue: Promise<void> = Promise.resolve();
	#logId = 0;

	get supported() {
		return typeof navigator !== 'undefined' && 'serial' in navigator;
	}

	async connect() {
		if (this.connection !== 'disconnected') return;
		this.lastError = '';
		let port: SerialPort;
		try {
			port = await navigator.serial.requestPort({ filters: [{ usbVendorId: VGX4.usbVendorId }] });
		} catch (error) {
			if (!(error instanceof DOMException && error.name === 'NotFoundError')) {
				this.lastError = error instanceof Error ? error.message : String(error);
			}
			return;
		}
		this.connection = 'connecting';
		try {
			await port.open({ baudRate: VGX4.baudRate });
			this.#port = port;
			this.#writer = port.writable!.getWriter();
			const decoder = new TextDecoderStream();
			this.#readDone = port
				.readable!.pipeTo(decoder.writable as WritableStream<Uint8Array>)
				.catch(() => {});
			this.#reader = decoder.readable.getReader();
			const greeted = this.#waitForGreeting();
			void this.#readLoop();
			await greeted;
			this.connection = 'connected';
			this.#poll = setInterval(() => void this.realtime(REALTIME.status), VGX4.pollIntervalMs);
			await this.send('$I');
		} catch (error) {
			this.lastError = error instanceof Error ? error.message : String(error);
			await this.disconnect();
		}
	}

	async disconnect() {
		clearInterval(this.#poll);
		this.#poll = undefined;
		this.#rejectPending(new Error('Disconnected'));
		await this.#closePort().catch(() => undefined);
		this.#port = undefined;
		this.#reader = undefined;
		this.#writer = undefined;
		this.connection = 'disconnected';
		this.status = undefined;
	}

	async send(line: string) {
		await this.sendAll([line]);
	}

	async sendAll(lines: string[]) {
		const queued = this.#queue.then(async () => {
			const acks: Promise<void>[] = [];
			for (const line of lines) acks.push((await this.#enqueue(line)).ack);
			return acks;
		});
		this.#queue = queued.then(
			() => undefined,
			() => undefined
		);
		await Promise.all(await queued);
	}

	async #enqueue(line: string) {
		const data = line.trim() + '\n';
		while (this.#bufferUsed() + data.length > VGX4.rxBufferSize - 1) {
			await new Promise<void>((resolve) => this.#spaceWaiters.push(resolve));
		}
		const ack = new Promise<void>((resolve, reject) =>
			this.#pending.push({ length: data.length, resolve, reject })
		);
		ack.catch(() => undefined);
		this.#addLog('tx', line.trim());
		await this.#write(data);
		return { ack };
	}

	async #closePort() {
		await this.#reader?.cancel();
		await this.#readDone;
		this.#writer?.releaseLock();
		await this.#port?.close();
	}

	async realtime(command: string) {
		if (!this.#writer) return;
		if (command !== REALTIME.status) this.#addLog('tx', `[${describeRealtime(command)}]`);
		await this.#write(command);
	}

	async #write(data: string) {
		if (!this.#writer) throw new Error('Not connected');
		await this.#writer.write(this.#encoder.encode(data));
	}

	#bufferUsed() {
		return this.#pending.reduce((sum, entry) => sum + entry.length, 0);
	}

	#waitForGreeting() {
		return new Promise<void>((resolve, reject) => {
			const timer = setTimeout(
				() => reject(new Error('No response from the plotter. Is it switched on?')),
				GREETING_TIMEOUT_MS
			);
			this.#greetingWaiter = () => {
				clearTimeout(timer);
				resolve();
			};
		});
	}

	async #readLoop() {
		let buffer = '';
		try {
			while (this.#reader) {
				const { value, done } = await this.#reader.read();
				if (done) break;
				buffer += value;
				let index: number;
				while ((index = buffer.indexOf('\n')) >= 0) {
					const line = buffer.slice(0, index).trim();
					buffer = buffer.slice(index + 1);
					if (line) this.#handle(line);
				}
			}
		} catch (error) {
			this.lastError = error instanceof Error ? error.message : String(error);
		}
		if (this.connection !== 'disconnected') await this.disconnect();
	}

	#handle(line: string) {
		const message = parseLine(line);
		if (message.kind !== 'status') this.#addLog('rx', line);
		switch (message.kind) {
			case 'ok':
				this.#resolveNext();
				break;
			case 'error':
				this.lastError = `GRBL error:${message.code}`;
				this.#resolveNext(new Error(this.lastError));
				break;
			case 'alarm':
				this.alarm = message.code;
				break;
			case 'greeting':
				this.greeting = message.text;
				this.alarm = undefined;
				this.#rejectPending(new Error('The plotter was reset'));
				this.#greetingWaiter?.();
				this.#greetingWaiter = undefined;
				break;
			case 'version':
				this.version = message.version;
				break;
			case 'status':
				this.status = message.report;
				if (message.report.wco) this.wco = message.report.wco;
				if (message.report.state === 'Alarm') this.alarm ??= 0;
				break;
		}
	}

	#resolveNext(error?: Error) {
		const entry = this.#pending.shift();
		if (entry) {
			if (error) entry.reject(error);
			else entry.resolve();
		}
		this.#spaceWaiters.splice(0).forEach((wake) => wake());
	}

	#rejectPending(error: Error) {
		this.#pending.splice(0).forEach((entry) => entry.reject(error));
		this.#spaceWaiters.splice(0).forEach((wake) => wake());
	}

	#addLog(direction: LogEntry['direction'], text: string) {
		this.log.push({ id: this.#logId++, direction, text });
		if (this.log.length > LOG_LIMIT) this.log.splice(0, this.log.length - LOG_LIMIT);
	}
}

function describeRealtime(command: string) {
	const names: Record<string, string> = {
		[REALTIME.feedHold]: 'Pause',
		[REALTIME.cycleStart]: 'Resume',
		[REALTIME.softReset]: 'Stop',
		[REALTIME.jogCancel]: 'Cancel jog'
	};
	return names[command] ?? 'Realtime command';
}

export const plotter = new Plotter();
