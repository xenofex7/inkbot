<script lang="ts">
	import { t } from '../i18n.svelte';
	import {
		ArrowDownToLine,
		ArrowUpFromLine,
		Minus,
		OctagonX,
		Pause,
		Play,
		Plus
	} from '@lucide/svelte';
	import Button from './Button.svelte';
	import PaperFields from './PaperFields.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import { penDown, penUp } from '../grbl/commands';
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
				aria-label={t('bar.penUp')}
			>
				<ArrowUpFromLine size={16} />
				{t('bar.up')}
			</Button>
			<Button
				class="h-9! px-3!"
				onclick={() => run(penDown(settings.penDownS))}
				disabled={!canAct}
				aria-label={t('bar.penDown')}
			>
				<ArrowDownToLine size={16} />
				{t('bar.down')}
			</Button>
			<label class="flex items-center gap-1.5 text-ink-mute" for="pen-depth">
				{t('bar.depth')}
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

		<div class="font-mono text-ink" aria-label={t('bar.position')}>
			X {format(position?.x)} · Y {format(position?.y)} mm
		</div>

		<PaperFields idPrefix="bar" />

		<div class="ml-auto flex items-center gap-2">
			{#if running}
				<div class="flex items-center gap-1" role="group" aria-label={t('bar.speed')}>
					<Button
						variant="icon"
						onclick={() => plotter.realtime(REALTIME.feedSlower)}
						disabled={plotter.feedOverride <= 10}
						aria-label={t('bar.slower')}
					>
						<Minus size={16} />
					</Button>
					<button
						type="button"
						class="min-w-24 rounded-md px-2 py-1 text-center text-ink hover:bg-surface-soft"
						title={t('bar.speedReset')}
						onclick={() => plotter.realtime(REALTIME.feedReset)}
					>
						{t('bar.speedValue', { value: plotter.feedOverride })}
					</button>
					<Button
						variant="icon"
						onclick={() => plotter.realtime(REALTIME.feedFaster)}
						disabled={plotter.feedOverride >= 200}
						aria-label={t('bar.faster')}
					>
						<Plus size={16} />
					</Button>
				</div>
				{#if plotter.status?.state === 'Hold'}
					<Button class="h-9! px-3!" onclick={() => plotter.realtime(REALTIME.cycleStart)}>
						<Play size={16} />
						{t('job.resume')}
					</Button>
				{:else}
					<Button class="h-9! px-3!" onclick={() => plotter.realtime(REALTIME.feedHold)}>
						<Pause size={16} />
						{t('job.pause')}
					</Button>
				{/if}
				<Button
					variant="stop"
					class="h-9! px-3!"
					onclick={() => plotter.realtime(REALTIME.softReset)}
				>
					<OctagonX size={16} />
					{t('job.stop')}
				</Button>
			{/if}
			<StatusBadge />
		</div>

		{#if error}
			<p class="basis-full text-danger" role="alert">{error}</p>
		{/if}
	</div>
</div>
