export type MachineState =
	'Idle' | 'Run' | 'Hold' | 'Jog' | 'Alarm' | 'Door' | 'Check' | 'Home' | 'Sleep';

export type Position = { x: number; y: number; z: number };

export type StatusReport = {
	state: MachineState;
	subState?: number;
	mpos?: Position;
	wco?: Position;
	feed?: number;
	spindle?: number;
	spindleOn?: boolean;
};

export type GrblMessage =
	| { kind: 'ok' }
	| { kind: 'error'; code: number }
	| { kind: 'alarm'; code: number }
	| { kind: 'greeting'; text: string }
	| { kind: 'status'; report: StatusReport }
	| { kind: 'setting'; key: number; value: string }
	| { kind: 'version'; version: string }
	| { kind: 'options'; options: string }
	| { kind: 'other'; text: string };

function parsePosition(value: string): Position | undefined {
	const [x, y, z] = value.split(',').map(Number);
	if ([x, y].some((n) => Number.isNaN(n))) return undefined;
	return { x, y, z: Number.isNaN(z) ? 0 : z };
}

export function parseStatus(line: string): StatusReport | undefined {
	const match = /^<(.*)>$/.exec(line);
	if (!match) return undefined;
	const [head, ...fields] = match[1].split('|');
	const [state, sub] = head.split(':');
	const report: StatusReport = { state: state as MachineState, spindleOn: false };
	if (sub !== undefined) report.subState = Number(sub);
	for (const field of fields) {
		const [key, value = ''] = field.split(':');
		if (key === 'MPos') report.mpos = parsePosition(value);
		else if (key === 'WCO') report.wco = parsePosition(value);
		else if (key === 'FS') {
			const [feed, spindle] = value.split(',').map(Number);
			report.feed = feed;
			report.spindle = spindle;
		} else if (key === 'A') report.spindleOn = value.includes('S');
	}
	return report;
}

export function parseLine(raw: string): GrblMessage {
	const line = raw.trim();
	if (line === 'ok') return { kind: 'ok' };
	const error = /^error:(\d+)$/.exec(line);
	if (error) return { kind: 'error', code: Number(error[1]) };
	const alarm = /^ALARM:(\d+)$/.exec(line);
	if (alarm) return { kind: 'alarm', code: Number(alarm[1]) };
	if (/1\.1\w* \['\$' for help\]$/.test(line)) return { kind: 'greeting', text: line };
	const status = parseStatus(line);
	if (status) return { kind: 'status', report: status };
	const setting = /^\$(\d+)=(.*)$/.exec(line);
	if (setting) return { kind: 'setting', key: Number(setting[1]), value: setting[2] };
	const version = /^\[VER:([^\]:]*)/.exec(line);
	if (version) return { kind: 'version', version: version[1] };
	const options = /^\[OPT:([^\]]*)\]$/.exec(line);
	if (options) return { kind: 'options', options: options[1] };
	return { kind: 'other', text: line };
}

export function workPosition(report: StatusReport, wco: Position): Position | undefined {
	if (!report.mpos) return undefined;
	return {
		x: report.mpos.x - wco.x,
		y: report.mpos.y - wco.y,
		z: report.mpos.z - wco.z
	};
}
