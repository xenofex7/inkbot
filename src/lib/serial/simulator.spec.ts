import { describe, expect, it } from 'vitest';
import { GrblSimulator } from './simulator';
import { parseStatus } from '../grbl/parse';
import { REALTIME } from '../grbl/vgx4';
import { toGcode } from '../gcode/fromPolylines';
import { jog, setOrigin } from '../grbl/commands';

const encoder = new TextEncoder();

function machine() {
	const out: string[] = [];
	const sim = new GrblSimulator((line) => out.push(line));
	const send = (text: string) => sim.receive(encoder.encode(text));
	const status = () => {
		out.length = 0;
		send(REALTIME.status);
		return parseStatus(out[0])!;
	};
	const run = (ms: number) => {
		for (let t = 0; t < ms; t += 20) sim.advance(20);
	};
	return { sim, out, send, status, run };
}

describe('GrblSimulator', () => {
	it('greets and reports like the VigoWriter', () => {
		const { sim, out, send } = machine();
		sim.start();
		send('$I\n');
		expect(out).toEqual([
			'',
			"VigoWriter 1.1f ['$' for help]",
			'[VER:1.1f.20170131:]',
			'[OPT:VC,15,128]',
			'ok'
		]);
	});

	it('moves at the programmed feed and ends on target', () => {
		const { send, status, run } = machine();
		send('G21 G90\nG1 X10 Y0 F600\n');
		run(500);
		const half = status();
		expect(half.state).toBe('Run');
		expect(half.mpos!.x).toBeCloseTo(5, 0);
		run(600);
		const done = status();
		expect(done.state).toBe('Idle');
		expect(done.mpos!.x).toBeCloseTo(10, 5);
	});

	it('keeps the ok back while the planner is full', () => {
		const { out, send, run } = machine();
		const lines = Array.from({ length: 20 }, (_, i) => `G1 X${i + 1} F600`).join('\n') + '\n';
		send(lines);
		expect(out.filter((line) => line === 'ok')).toHaveLength(15);
		run(30000);
		expect(out.filter((line) => line === 'ok')).toHaveLength(20);
	});

	it('acks a dwell only after the time is over', () => {
		const { out, send, run } = machine();
		send('M3 S905\nG4 P0.3\n');
		expect(out).toEqual(['ok']);
		run(200);
		expect(out).toEqual(['ok']);
		run(200);
		expect(out).toEqual(['ok', 'ok']);
	});

	it('sets the work origin with G10 L20 and keeps G54 across a reset', () => {
		const { send, status, run } = machine();
		send('G0 X20 Y-5\n');
		run(1000);
		send(setOrigin().join('\n') + '\n');
		expect(status().wco).toEqual({ x: 20, y: -5, z: 0 });
		send(REALTIME.softReset);
		expect(status().wco).toEqual({ x: 20, y: -5, z: 0 });
		const next = machine();
		expect(next.status().wco).toEqual({ x: 20, y: -5, z: 0 });
		next.send('G10 L2 P1 X0 Y0\n');
	});

	it('reports Idle during a dwell and resets it without an alarm', () => {
		const { out, send, status, run } = machine();
		send('M5\nG4 P0.3\n');
		run(100);
		expect(status().state).toBe('Idle');
		send(REALTIME.softReset);
		expect(out).not.toContain('ALARM:3');
	});

	it('rejects G-code while a jog runs', () => {
		const { out, send, run } = machine();
		send('$J=G91 X50 F3000\n');
		run(100);
		send('M5\n');
		expect(out).toEqual(['ok', 'error:9']);
	});

	it('raises ALARM:3 when reset during a move and unlocks with $X', () => {
		const { out, send, status, run } = machine();
		send('G1 X50 F600\n');
		run(200);
		send(REALTIME.softReset);
		expect(out).toContain('ALARM:3');
		expect(status().state).toBe('Alarm');
		out.length = 0;
		send('G0 X0\n');
		expect(out).toEqual(['error:9']);
		send('$X\n');
		expect(status().state).toBe('Idle');
	});

	it('pauses on feed hold and resumes on cycle start', () => {
		const { send, status, run } = machine();
		send('G1 X10 F600\n');
		run(200);
		send(REALTIME.feedHold);
		const held = status();
		run(1000);
		expect(status().state).toBe('Hold');
		expect(status().mpos!.x).toBeCloseTo(held.mpos!.x, 5);
		send(REALTIME.cycleStart);
		run(2000);
		expect(status().mpos!.x).toBeCloseTo(10, 5);
	});

	it('jogs relative and machine absolute, and cancels a jog', () => {
		const { out, send, status, run } = machine();
		send(jog(5, 0).join('\n') + '\n');
		run(1000);
		expect(status().mpos!.x).toBeCloseTo(5, 5);
		send('$J=G53 G21 X-30 Y0 F600\n');
		run(300);
		send(REALTIME.jogCancel);
		const stopped = status().mpos!.x;
		run(1000);
		expect(status().state).toBe('Idle');
		expect(status().mpos!.x).toBeCloseTo(stopped, 5);
		out.length = 0;
		send('$J=G91 X1\n');
		expect(out).toEqual(['error:22']);
	});

	it('scales drawing moves with the feed override', () => {
		const { send, status, run } = machine();
		send(REALTIME.feedFaster.repeat(10));
		send('G1 X100 F600\n');
		run(1000);
		expect(status().mpos!.x).toBeCloseTo(20, 0);
		expect(status().feedOverride).toBe(200);
	});

	it('plays a whole generated job back to the start', () => {
		const { out, send, status, run } = machine();
		const gcode = toGcode([
			[
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 10, y: 10 }
			]
		]);
		let index = 0;
		let acked = 0;
		for (let step = 0; step < 2000 && acked < gcode.length; step++) {
			while (index < gcode.length && index - acked < 10) send(gcode[index++] + '\n');
			run(20);
			acked = out.filter((line) => line === 'ok').length;
		}
		expect(acked).toBe(gcode.length);
		expect(out.some((line) => line.startsWith('error'))).toBe(false);
		run(1000);
		expect(status().mpos).toEqual({ x: 0, y: 0, z: 0 });
	});
});
