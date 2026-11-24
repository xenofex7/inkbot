import { REALTIME } from '../grbl/vgx4';

type Point = { x: number; y: number };

type Block =
	| { kind: 'move'; to: Point; feed: number; rapid: boolean; jog: boolean }
	| { kind: 'dwell'; ms: number };

type Pending = { line: string; started: boolean };

type Reply = string | typeof WAIT;

const WAIT = Symbol('wait');
const GREETING = "VigoWriter 1.1f ['$' for help]";
const PLANNER_BLOCKS = 15;
const MAX_RATE = 5000;
const MAX_LINE = 80;

const SETTINGS = `$0=10
$1=25
$2=0
$3=3
$4=0
$5=0
$6=0
$10=1
$11=0.100
$12=0.002
$13=0
$20=0
$21=0
$22=0
$23=0
$24=25.000
$25=500.000
$26=250
$27=1.000
$30=1000
$31=0
$32=0
$100=160.000
$101=160.000
$102=250.000
$110=5000.000
$111=5000.000
$112=500.000
$120=400.000
$121=400.000
$122=10.000
$130=1000.000
$131=1000.000
$132=200.000`;

let eeprom: Point = { x: 0, y: 0 };

const fixed = (value: number) => value.toFixed(3);

export class GrblSimulator {
	#emit: (line: string) => void;
	#input = '';
	#lines: Pending[] = [];
	#blocks: Block[] = [];
	#position: Point = { x: 0, y: 0 };
	#planned: Point = { x: 0, y: 0 };
	#coord: Point = { ...eeprom };
	#offset: Point = { x: 0, y: 0 };
	#absolute = true;
	#motion: 'G0' | 'G1' = 'G0';
	#feed = 0;
	#spindle = 0;
	#spindleOn = false;
	#override = 100;
	#hold = false;
	#alarm = false;

	constructor(emit: (line: string) => void) {
		this.#emit = emit;
	}

	start() {
		this.#emit('');
		this.#emit(GREETING);
	}

	get state() {
		if (this.#alarm) return 'Alarm';
		if (this.#hold) return 'Hold:0';
		const current = this.#blocks[0];
		if (current?.kind !== 'move') return 'Idle';
		return current.jog ? 'Jog' : 'Run';
	}

	receive(bytes: Uint8Array) {
		for (const byte of bytes) {
			const char = String.fromCharCode(byte);
			if (char === REALTIME.status) this.#report();
			else if (char === REALTIME.feedHold) this.#feedHold();
			else if (char === REALTIME.cycleStart) this.#hold = false;
			else if (char === REALTIME.softReset) this.#softReset();
			else if (char === REALTIME.jogCancel) this.#cancelJog();
			else if (char === REALTIME.feedReset) this.#override = 100;
			else if (char === REALTIME.feedFaster) this.#override = Math.min(200, this.#override + 10);
			else if (char === REALTIME.feedSlower) this.#override = Math.max(10, this.#override - 10);
			else if (byte >= 0x80) continue;
			else if (char === '\n' || char === '\r') {
				const line = this.#input;
				this.#input = '';
				if (char === '\n' || line) this.#lines.push({ line, started: false });
			} else this.#input += char;
		}
		this.#process();
	}

	advance(ms: number) {
		let budget = ms;
		while (budget > 0 && !this.#hold && !this.#alarm) {
			const block = this.#blocks[0];
			if (!block) break;
			if (block.kind === 'dwell') {
				const used = Math.min(budget, block.ms);
				block.ms -= used;
				budget -= used;
				if (block.ms <= 0) this.#blocks.shift();
				continue;
			}
			const speed = Math.min(this.#rate(block), MAX_RATE) / 60000;
			const dx = block.to.x - this.#position.x;
			const dy = block.to.y - this.#position.y;
			const distance = Math.hypot(dx, dy);
			const needed = distance / speed;
			if (needed <= budget) {
				this.#position = { ...block.to };
				budget -= needed;
				this.#blocks.shift();
			} else {
				const reach = speed * budget;
				this.#position = {
					x: this.#position.x + (dx / distance) * reach,
					y: this.#position.y + (dy / distance) * reach
				};
				budget = 0;
			}
		}
		this.#process();
	}

	#report() {
		const wco = { x: this.#coord.x + this.#offset.x, y: this.#coord.y + this.#offset.y };
		const block = this.#blocks[0];
		const moving = block?.kind === 'move' && !this.#hold && !this.#alarm;
		const feed = moving ? Math.round(this.#rate(block)) : 0;
		const spindle = this.#spindleOn ? this.#spindle : 0;
		this.#emit(
			`<${this.state}|MPos:${fixed(this.#position.x)},${fixed(this.#position.y)},0.000|FS:${feed},${spindle}|Ov:${this.#override},100,100|WCO:${fixed(wco.x)},${fixed(wco.y)},0.000>`
		);
	}

	#rate(block: Extract<Block, { kind: 'move' }>) {
		return block.rapid || block.jog ? block.feed : (block.feed * this.#override) / 100;
	}

	#feedHold() {
		const block = this.#blocks[0];
		if (block?.kind === 'move' && block.jog) this.#cancelJog();
		else if (this.state === 'Run') this.#hold = true;
	}

	#cancelJog() {
		const block = this.#blocks[0];
		if (block?.kind !== 'move' || !block.jog) return;
		this.#blocks = this.#blocks.filter((block) => block.kind !== 'move' || !block.jog);
		this.#planned = { ...this.#position };
	}

	#softReset() {
		const moving = this.#blocks.some((block) => block.kind === 'move') && !this.#alarm;
		this.#lines = [];
		this.#blocks = [];
		this.#input = '';
		this.#hold = false;
		this.#planned = { ...this.#position };
		this.#offset = { x: 0, y: 0 };
		this.#absolute = true;
		this.#motion = 'G0';
		this.#spindleOn = false;
		this.#override = 100;
		if (moving) {
			this.#alarm = true;
			this.#emit('ALARM:3');
		}
		this.start();
		if (this.#alarm) this.#emit("[MSG:'$H'|'$X' to unlock]");
	}

	#process() {
		while (this.#lines.length > 0) {
			const pending = this.#lines[0];
			const line = pending.line
				.replace(/\([^)]*\)|;.*$/g, '')
				.replace(/\s+/g, '')
				.toUpperCase();
			const result = this.#execute(line, pending);
			if (result === WAIT) return;
			this.#lines.shift();
			if (result !== undefined) this.#emit(result);
		}
	}

	#execute(line: string, pending: Pending): Reply {
		if (line === '') return 'ok';
		if (line.length > MAX_LINE) return 'error:14';
		if (line.startsWith('$')) return this.#system(line);
		if (this.#alarm || this.state === 'Jog') return 'error:9';
		return this.#gcode(line, pending);
	}

	#system(line: string): Reply {
		if (line.startsWith('$J=')) {
			if (this.#alarm) return 'error:9';
			const busy = this.#blocks.some((block) => block.kind !== 'move' || !block.jog);
			if (busy || this.#hold) return 'error:8';
			if (this.#blocks.length >= PLANNER_BLOCKS) return WAIT;
			return this.#jog(line.slice(3));
		}
		if (line === '$X') {
			if (this.#alarm) {
				this.#alarm = false;
				this.#emit('[MSG:Caution: Unlocked]');
			}
			return 'ok';
		}
		if (this.#alarm && !['$$', '$I', '$G', '$#'].includes(line)) return 'error:9';
		if (this.#blocks.length > 0 && line !== '$G' && line !== '$#') return 'error:8';
		if (line === '$') {
			this.#emit('[HLP:$$ $# $G $I $N $x=val $Nx=line $J=line $SLP $C $X $H ~ ! ? ctrl-x]');
			return 'ok';
		}
		if (line === '$I') {
			this.#emit('[VER:1.1f.20170131:]');
			this.#emit('[OPT:VC,15,128]');
			return 'ok';
		}
		if (line === '$$') {
			SETTINGS.split('\n').forEach((setting) => this.#emit(setting));
			return 'ok';
		}
		if (line === '$G') {
			const motion = this.#motion === 'G0' ? 'G0' : 'G1';
			const distance = this.#absolute ? 'G90' : 'G91';
			const spindle = this.#spindleOn ? 'M3' : 'M5';
			this.#emit(
				`[GC:${motion} G54 G17 G21 ${distance} G94 ${spindle} M9 T0 F${this.#feed} S${this.#spindle}]`
			);
			return 'ok';
		}
		if (line === '$#') {
			this.#emit(`[G54:${fixed(this.#coord.x)},${fixed(this.#coord.y)},0.000]`);
			this.#emit(`[G92:${fixed(this.#offset.x)},${fixed(this.#offset.y)},0.000]`);
			return 'ok';
		}
		if (line === '$H') return 'error:5';
		if (/^\$\d+=/.test(line) || ['$N', '$C', '$SLP'].includes(line)) return 'ok';
		return 'error:3';
	}

	#words(line: string) {
		const words: { letter: string; value: number }[] = [];
		const pattern = /([A-Z])([-+]?(?:\d+\.?\d*|\.\d+))/gy;
		let match: RegExpExecArray | null;
		let index = 0;
		while ((match = pattern.exec(line))) {
			words.push({ letter: match[1], value: Number(match[2]) });
			index = pattern.lastIndex;
		}
		return index === line.length ? words : undefined;
	}

	#jog(body: string): string {
		const words = this.#words(body);
		if (!words) return 'error:1';
		let absolute = this.#absolute;
		let machine = false;
		let feed: number | undefined;
		const target: Partial<Point> = {};
		for (const { letter, value } of words) {
			if (letter === 'G' && value === 90) absolute = true;
			else if (letter === 'G' && value === 91) absolute = false;
			else if (letter === 'G' && value === 53) machine = true;
			else if (letter === 'G' && (value === 21 || value === 20)) continue;
			else if (letter === 'F') feed = value;
			else if (letter === 'X') target.x = value;
			else if (letter === 'Y') target.y = value;
			else return 'error:20';
		}
		if (feed === undefined || feed <= 0) return 'error:22';
		if (target.x === undefined && target.y === undefined) return 'error:26';
		const to = this.#resolve(target, absolute, machine);
		this.#planned = to;
		this.#blocks.push({ kind: 'move', to, feed, rapid: false, jog: true });
		return 'ok';
	}

	#resolve(target: Partial<Point>, absolute: boolean, machine: boolean): Point {
		const wco = machine
			? { x: 0, y: 0 }
			: { x: this.#coord.x + this.#offset.x, y: this.#coord.y + this.#offset.y };
		const axis = (key: 'x' | 'y') => {
			const value = target[key];
			if (value === undefined) return this.#planned[key];
			return absolute && !machine ? value + wco[key] : machine ? value : this.#planned[key] + value;
		};
		return { x: axis('x'), y: axis('y') };
	}

	#gcode(line: string, pending: Pending): Reply {
		const words = this.#words(line);
		if (!words) return 'error:1';
		const codes = words.filter((word) => word.letter === 'G').map((word) => word.value);
		const m = words.filter((word) => word.letter === 'M').map((word) => word.value);
		const value = (letter: string) => words.find((word) => word.letter === letter)?.value;
		const known = [0, 1, 4, 10, 17, 20, 21, 53, 54, 90, 91, 92, 92.1, 94];
		if (codes.some((code) => !known.includes(code))) return 'error:20';
		if (m.some((code) => ![3, 5, 9, 2, 30].includes(code))) return 'error:20';
		if (words.some((word) => !'GMXYZFSPL'.includes(word.letter))) return 'error:20';

		const syncs = codes.includes(4) || m.includes(3) || m.includes(5);
		if (syncs && this.#blocks.length > 0) return WAIT;
		if (!syncs && this.#blocks.length >= PLANNER_BLOCKS) return WAIT;

		if (codes.includes(4)) {
			const seconds = value('P') ?? 0;
			if (!pending.started) {
				pending.started = true;
				this.#blocks.push({ kind: 'dwell', ms: seconds * 1000 });
				return WAIT;
			}
			return this.#blocks.length > 0 ? WAIT : 'ok';
		}

		if (codes.includes(90)) this.#absolute = true;
		if (codes.includes(91)) this.#absolute = false;
		const feed = value('F');
		if (feed !== undefined) this.#feed = feed;
		const spindle = value('S');
		if (spindle !== undefined) this.#spindle = spindle;
		if (m.includes(3)) this.#spindleOn = true;
		if (m.includes(5)) this.#spindleOn = false;

		const target: Partial<Point> = {};
		const x = value('X');
		const y = value('Y');
		if (x !== undefined) target.x = x;
		if (y !== undefined) target.y = y;

		if (codes.includes(92.1)) {
			this.#offset = { x: 0, y: 0 };
			return 'ok';
		}
		if (codes.includes(92)) {
			this.#offset = {
				x: x === undefined ? this.#offset.x : this.#planned.x - this.#coord.x - x,
				y: y === undefined ? this.#offset.y : this.#planned.y - this.#coord.y - y
			};
			return 'ok';
		}
		if (codes.includes(10)) {
			const l = value('L');
			if (value('P') !== 1 && value('P') !== 0) return 'error:29';
			if (l === 2) {
				this.#coord = { x: x ?? this.#coord.x, y: y ?? this.#coord.y };
			} else if (l === 20) {
				this.#coord = {
					x: x === undefined ? this.#coord.x : this.#planned.x - this.#offset.x - x,
					y: y === undefined ? this.#coord.y : this.#planned.y - this.#offset.y - y
				};
			} else return 'error:20';
			eeprom = { ...this.#coord };
			return 'ok';
		}

		if (codes.includes(0)) this.#motion = 'G0';
		if (codes.includes(1)) this.#motion = 'G1';
		if (target.x === undefined && target.y === undefined) return 'ok';
		const rapid = this.#motion === 'G0';
		if (!rapid && this.#feed <= 0) return 'error:22';
		const to = this.#resolve(target, this.#absolute, codes.includes(53));
		this.#planned = to;
		this.#blocks.push({ kind: 'move', to, feed: rapid ? MAX_RATE : this.#feed, rapid, jog: false });
		return 'ok';
	}
}

export function simulatedPort() {
	const encoder = new TextEncoder();
	let output: ReadableStreamDefaultController<Uint8Array> | undefined;
	let timer: ReturnType<typeof setInterval> | undefined;
	let last = 0;
	const simulator = new GrblSimulator((line) => {
		try {
			output?.enqueue(encoder.encode(line + '\r\n'));
		} catch {
			output = undefined;
		}
	});

	const readable = new ReadableStream<Uint8Array>({
		start(controller) {
			output = controller;
		},
		cancel() {
			output = undefined;
		}
	});
	const writable = new WritableStream<Uint8Array>({
		write(chunk) {
			simulator.receive(chunk);
		}
	});

	return {
		readable,
		writable,
		open() {
			last = performance.now();
			timer = setInterval(() => {
				const now = performance.now();
				simulator.advance(now - last);
				last = now;
			}, 20);
			setTimeout(() => simulator.start(), 50);
			return Promise.resolve();
		},
		close() {
			clearInterval(timer);
			try {
				output?.close();
			} catch {
				output = undefined;
			}
			return Promise.resolve();
		}
	};
}
