<script lang="ts">
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
	aria-label="Sheet preview, {width} × {height} mm"
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
		<circle cx={pen.x} cy={pen.y} r="1.2" class="fill-seal" opacity="0.8" />
	{/if}
</svg>
