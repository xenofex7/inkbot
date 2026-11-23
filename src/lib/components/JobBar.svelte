<script lang="ts">
	import { t } from '../i18n.svelte';
	import { Minus, OctagonX, Pause, Play, Plus } from '@lucide/svelte';
	import Button from './Button.svelte';
	import { REALTIME } from '../grbl/vgx4';
	import { plotter } from '../serial/plotter.svelte';

	const paused = $derived(plotter.status?.state === 'Hold');
	const percent = $derived(
		plotter.jobTotal > 0 ? Math.min(100, Math.round((plotter.jobDone / plotter.jobTotal) * 100)) : 0
	);
	const showProgress = $derived(plotter.jobTotal > 10);
</script>

<div class="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-surface-card" role="status">
	<div
		class="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 text-sm"
	>
		<div class="flex min-w-48 flex-1 items-center gap-3">
			<span class="size-2.5 shrink-0 rounded-full {paused ? 'bg-warning' : 'animate-pulse bg-seal'}"
			></span>
			<span class="font-semibold text-ink">{paused ? t('status.paused') : t('job.running')}</span>
			{#if showProgress}
				<div
					class="h-1.5 min-w-24 flex-1 overflow-hidden rounded-pill bg-surface-strong"
					role="progressbar"
					aria-valuemin="0"
					aria-valuemax="100"
					aria-valuenow={percent}
				>
					<div
						class="h-full rounded-pill bg-seal transition-[width]"
						style="width: {percent}%"
					></div>
				</div>
				<span class="w-10 text-right text-ink-mute">{percent} %</span>
			{/if}
		</div>

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

		<div class="flex items-center gap-2">
			{#if paused}
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
		</div>
	</div>
</div>
