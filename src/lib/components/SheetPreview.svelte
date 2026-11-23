<script lang="ts">
	import PrintableArea from './PrintableArea.svelte';
	import { t } from '../i18n.svelte';
	import type { Point, Polyline } from '../geometry/types';

	let {
		width,
		height,
		margin,
		polylines,
		pen
	}: {
		width: number;
		height: number;
		margin: number;
		polylines: Polyline[];
		pen?: Point;
	} = $props();

	const toPoints = (line: Polyline) => line.map((p) => `${p.x},${p.y}`).join(' ');
</script>

<svg
	viewBox="-6 -6 {width + 12} {height + 12}"
	class="h-auto max-h-[70vh] w-full"
	role="img"
	aria-label={t('preview.label', { width, height })}
>
	<rect
		x="0"
		y="0"
		{width}
		{height}
		class="fill-surface-card"
		style="filter: drop-shadow(0 0.4px 0.6px rgb(0 0 0 / 0.12))"
	/>
	<rect
		x={margin}
		y={margin}
		width={Math.max(0, width - 2 * margin)}
		height={Math.max(0, height - 2 * margin)}
		fill="none"
		class="stroke-hairline"
		stroke-width="0.3"
		stroke-dasharray="1.5 1.5"
	/>
	<PrintableArea {width} {height} />
	{#each polylines as line, index (index)}
		<polyline
			points={toPoints(line)}
			fill="none"
			class="stroke-ink"
			stroke-width="0.35"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{/each}
	<circle cx="0" cy="0" r="1.4" class="fill-seal" />
	{#if pen}
		<g pointer-events="none">
			<circle cx={pen.x} cy={pen.y} r="2.4" fill="none" class="stroke-link" stroke-width="0.45" />
			<circle cx={pen.x} cy={pen.y} r="0.6" class="fill-link" />
		</g>
	{/if}
</svg>
