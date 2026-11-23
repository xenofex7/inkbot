<script lang="ts">
	import { positions } from '../machine/positions.svelte';

	let { width, height }: { width: number; height: number } = $props();

	const id = $props.id();
	const area = $derived.by(() => {
		const p = positions.printable;
		if (!p) return undefined;
		const minX = Math.max(0, p.minX);
		const minY = Math.max(0, p.minY);
		const maxX = Math.min(width, p.maxX);
		const maxY = Math.min(height, p.maxY);
		const covers = p.minX <= 0 && p.minY <= 0 && p.maxX >= width && p.maxY >= height;
		return { minX, minY, maxX: Math.max(minX, maxX), maxY: Math.max(minY, maxY), covers };
	});
</script>

{#if area && !area.covers}
	<defs>
		<pattern
			id="hatch-{id}"
			width="3"
			height="3"
			patternUnits="userSpaceOnUse"
			patternTransform="rotate(45)"
		>
			<line x1="0" y1="0" x2="0" y2="3" class="stroke-ink-mute/70" stroke-width="0.6" />
		</pattern>
	</defs>
	<path
		d="M0 0H{width}V{height}H0Z M{area.minX} {area.minY}H{area.maxX}V{area.maxY}H{area.minX}Z"
		fill="url(#hatch-{id})"
		fill-rule="evenodd"
		pointer-events="none"
	/>
	<rect
		x={area.minX}
		y={area.minY}
		width={area.maxX - area.minX}
		height={area.maxY - area.minY}
		fill="none"
		class="stroke-link"
		stroke-width="0.5"
		stroke-dasharray="2 1.2"
		pointer-events="none"
	/>
{/if}
