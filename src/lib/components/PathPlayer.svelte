<script lang="ts">
	import { t } from '../i18n.svelte';
	import { Pause, PenLine, Play } from '@lucide/svelte';
	import Button from './Button.svelte';
	import type { Point, Polyline } from '../geometry/types';

	let {
		polylines,
		sheet,
		canDraw,
		onresume
	}: {
		polylines: Polyline[];
		sheet: { width: number; height: number };
		canDraw: boolean;
		onresume: (from: number) => void;
	} = $props();

	const DURATION_MS = 8000;

	let progress = $state(0);
	let playing = $state(false);
	let timer: ReturnType<typeof setInterval> | undefined;

	const total = $derived(polylines.length);
	const travels = $derived(
		polylines.map((line, index): Polyline => [
			index === 0 ? { x: 0, y: 0 } : polylines[index - 1].at(-1)!,
			line[0]
		])
	);
	const pen = $derived<Point>(progress === 0 ? { x: 0, y: 0 } : polylines[progress - 1].at(-1)!);

	$effect(() => {
		void polylines;
		progress = 0;
		stop();
	});

	$effect(() => () => stop());

	function stop() {
		playing = false;
		clearInterval(timer);
	}

	function play() {
		if (progress >= total) progress = 0;
		playing = true;
		const step = Math.max(1, Math.ceil(total / (DURATION_MS / 40)));
		timer = setInterval(() => {
			progress = Math.min(total, progress + step);
			if (progress >= total) stop();
		}, 40);
	}

	const points = (line: Point[]) => line.map((p) => `${p.x},${p.y}`).join(' ');
</script>

<div class="basis-full space-y-3 rounded-md bg-surface-card p-4">
	<svg
		viewBox="-4 -4 {sheet.width + 8} {sheet.height + 8}"
		class="max-h-80 w-full"
		role="img"
		aria-label={t('player.label')}
	>
		<rect width={sheet.width} height={sheet.height} class="fill-canvas" />
		{#each polylines.slice(0, progress) as line, index (index)}
			<polyline
				points={points(travels[index])}
				fill="none"
				class="stroke-seal/40"
				stroke-width="0.25"
				stroke-dasharray="1 1"
			/>
			<polyline
				points={points(line)}
				fill="none"
				class="stroke-ink"
				stroke-width="0.35"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		{/each}
		{#each polylines.slice(progress) as line, index (index)}
			<polyline
				points={points(line)}
				fill="none"
				class="stroke-ink/15"
				stroke-width="0.35"
				stroke-linecap="round"
			/>
		{/each}
		<circle cx={pen.x} cy={pen.y} r="1.4" class="fill-seal" />
	</svg>

	<div class="flex items-center gap-3">
		<Button
			variant="icon"
			onclick={() => (playing ? stop() : play())}
			aria-label={playing ? t('player.pause') : t('player.play')}
		>
			{#if playing}<Pause size={16} />{:else}<Play size={16} />{/if}
		</Button>
		<input
			type="range"
			min="0"
			max={total}
			bind:value={progress}
			oninput={stop}
			class="flex-1 accent-primary"
			aria-label={t('player.position')}
		/>
		<span class="w-28 text-right text-[13px] text-ink-mute">
			{t('player.count', { done: progress, total })}
		</span>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<Button onclick={() => onresume(progress)} disabled={!canDraw || progress >= total}>
			<PenLine size={16} />
			{t('player.resume', { from: progress + 1 })}
		</Button>
		<p class="flex-1 text-[13px] text-ink-mute">{t('player.hint')}</p>
	</div>
</div>
