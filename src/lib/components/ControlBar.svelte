<script lang="ts">
	import { ArrowDownToLine, ArrowUpFromLine, OctagonX, Pause, Play } from '@lucide/svelte';
	import Button from './Button.svelte';
	import { penDown, penUp } from '../grbl/commands';
	import { PAPER_FORMATS, type Orientation } from '../geometry/paper';
	import { orient } from '../geometry/types';
	import { REALTIME } from '../grbl/vgx4';
	import { plotter } from '../serial/plotter.svelte';
	import { settings } from '../settings.svelte';

	let error = $state('');

	const connected = $derived(plotter.connection === 'connected');
	const running = $derived(plotter.busy || plotter.status?.state === 'Hold');
	const canAct = $derived(connected && !running);
	const position = $derived(
		plotter.position ? orient(plotter.position, settings.invertY) : undefined
	);

	async function run(lines: string[]) {
		error = '';
		try {
			await plotter.sendAll(lines);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	async function changePenDepth() {
		if (canAct && plotter.penDown) await run(penDown(settings.penDownS));
	}

	const format = (value: number | undefined) => (value ?? 0).toFixed(1);
	const field = 'h-9 rounded-md border border-hairline bg-canvas px-2.5 text-sm text-ink';
</script>

<div class="border-b border-hairline-soft bg-surface-card">
	<div class="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 text-sm">
		<div class="flex items-center gap-2">
			<Button
				class="h-9! px-3!"
				onclick={() => run(penUp())}
				disabled={!canAct}
				aria-label="Pen up"
			>
				<ArrowUpFromLine size={16} /> Up
			</Button>
			<Button
				class="h-9! px-3!"
				onclick={() => run(penDown(settings.penDownS))}
				disabled={!canAct}
				aria-label="Pen down"
			>
				<ArrowDownToLine size={16} /> Down
			</Button>
			<label class="flex items-center gap-1.5 text-ink-mute" for="pen-depth">
				Depth S
				<input
					id="pen-depth"
					type="number"
					min="0"
					max="1000"
					step="5"
					bind:value={settings.penDownS}
					onchange={changePenDepth}
					class="{field} w-20"
				/>
			</label>
		</div>

		<div class="font-mono text-ink" aria-label="Pen position">
			X {format(position?.x)} · Y {format(position?.y)} mm
		</div>

		<div class="flex items-center gap-2">
			<label class="sr-only" for="bar-format">Paper format</label>
			<select id="bar-format" bind:value={settings.formatId} class={field}>
				{#each PAPER_FORMATS as option (option.id)}
					<option value={option.id}>{option.name}</option>
				{/each}
			</select>
			<label class="sr-only" for="bar-orientation">Orientation</label>
			<select
				id="bar-orientation"
				value={settings.orientation}
				onchange={(event) => (settings.orientation = event.currentTarget.value as Orientation)}
				class={field}
			>
				<option value="portrait">Portrait</option>
				<option value="landscape">Landscape</option>
			</select>
			<label class="flex items-center gap-1.5 text-ink-mute" for="bar-margin">
				Margin
				<input
					id="bar-margin"
					type="number"
					min="0"
					max="60"
					bind:value={settings.margin}
					class="{field} w-16"
				/>
			</label>
		</div>

		{#if running}
			<div class="ml-auto flex items-center gap-2">
				{#if plotter.status?.state === 'Hold'}
					<Button class="h-9! px-3!" onclick={() => plotter.realtime(REALTIME.cycleStart)}>
						<Play size={16} /> Resume
					</Button>
				{:else}
					<Button class="h-9! px-3!" onclick={() => plotter.realtime(REALTIME.feedHold)}>
						<Pause size={16} /> Pause
					</Button>
				{/if}
				<Button
					variant="stop"
					class="h-9! px-3!"
					onclick={() => plotter.realtime(REALTIME.softReset)}
				>
					<OctagonX size={16} /> Stop
				</Button>
			</div>
		{/if}

		{#if error}
			<p class="basis-full text-danger" role="alert">{error}</p>
		{/if}
	</div>
</div>
