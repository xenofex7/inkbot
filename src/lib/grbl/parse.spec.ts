import { describe, expect, it } from 'vitest';
import { parseLine, parseStatus, workPosition } from './parse';

describe('parseLine', () => {
	it('detects the VigoWriter greeting', () => {
		expect(parseLine("VigoWriter 1.1f ['$' for help]")).toEqual({
			kind: 'greeting',
			text: "VigoWriter 1.1f ['$' for help]"
		});
	});

	it('detects the stock GRBL greeting', () => {
		expect(parseLine("Grbl 1.1h ['$' for help]").kind).toBe('greeting');
	});

	it('parses ok, error and alarm', () => {
		expect(parseLine('ok\r')).toEqual({ kind: 'ok' });
		expect(parseLine('error:20')).toEqual({ kind: 'error', code: 20 });
		expect(parseLine('ALARM:2')).toEqual({ kind: 'alarm', code: 2 });
	});

	it('parses settings, version and options from the real machine', () => {
		expect(parseLine('$100=160.000')).toEqual({ kind: 'setting', key: 100, value: '160.000' });
		expect(parseLine('[VER:1.1f.20170131:]')).toEqual({
			kind: 'version',
			version: '1.1f.20170131'
		});
		expect(parseLine('[OPT:VC,15,128]')).toEqual({ kind: 'options', options: 'VC,15,128' });
	});

	it('keeps unknown lines as other', () => {
		expect(parseLine('[GC:G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]').kind).toBe('other');
	});
});

describe('parseStatus', () => {
	it('parses an idle report with WCO', () => {
		expect(parseStatus('<Idle|MPos:0.000,-30.000,0.000|FS:0,0|WCO:0.000,0.000,0.000>')).toEqual({
			state: 'Idle',
			mpos: { x: 0, y: -30, z: 0 },
			feed: 0,
			spindle: 0,
			wco: { x: 0, y: 0, z: 0 }
		});
	});

	it('parses a running report with override fields', () => {
		const report = parseStatus('<Run|MPos:6.544,-10.000,0.000|FS:7071,0|Ov:100,100,100|A:S>');
		expect(report?.state).toBe('Run');
		expect(report?.feed).toBe(7071);
	});

	it('parses sub states', () => {
		expect(parseStatus('<Hold:0|MPos:1.000,2.000,0.000|FS:0,0>')?.subState).toBe(0);
	});

	it('rejects non-status lines', () => {
		expect(parseStatus('ok')).toBeUndefined();
	});
});

describe('workPosition', () => {
	it('subtracts the work coordinate offset', () => {
		const report = parseStatus('<Idle|MPos:25.000,40.000,0.000|FS:0,0>');
		expect(report).toBeDefined();
		expect(workPosition(report!, { x: 5, y: 10, z: 0 })).toEqual({ x: 20, y: 30, z: 0 });
	});
});
