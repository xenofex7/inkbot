<script lang="ts">
	import type { Point } from '../geometry/types';
	import { PAD } from '../handwriting/model';

	let {
		strokes = $bindable([]),
		ghost = [],
		label = ''
	}: { strokes: Point[][]; ghost?: Point[][]; label?: string } = $props();

	let svg: SVGSVGElement;
	let current = $state<Point[] | undefined>();

	const guides = [
		{ y: PAD.ascent - PAD.capHeight, dashed: true },
		{ y: PAD.ascent - PAD.xHeight, dashed: true },
		{ y: PAD.ascent, dashed: false }
	];

	function toPad(event: PointerEvent): Point {
		const box = svg.getBoundingClientRect();
		return {
			x: ((event.clientX - box.left) / box.width) * PAD.size,
			y: ((event.clientY - box.top) / box.height) * PAD.size
		};
	}

	function start(event: PointerEvent) {
		event.preventDefault();
		svg.setPointerCapture(event.pointerId);
		current = [toPad(event)];
	}

	function move(event: PointerEvent) {
		if (!current) return;
		const coalesced = event.getCoalescedEvents?.() ?? [];
		current = [...current, ...(coalesced.length > 0 ? coalesced : [event]).map(toPad)];
	}

	function end() {
		if (current) strokes = [...strokes, current];
		current = undefined;
	}

	const points = (line: Point[]) => line.map((p) => `${p.x},${p.y}`).join(' ');
</script>

<svg
	bind:this={svg}
	viewBox="0 0 {PAD.size} {PAD.size}"
	class="aspect-square w-full touch-none rounded-lg border border-hairline bg-surface-card select-none"
	role="img"
	aria-label={label}
	onpointerdown={start}
	onpointermove={move}
	onpointerup={end}
	onpointercancel={end}
>
	{#each guides as guide (guide.y)}
		<line
			x1="0"
			x2={PAD.size}
			y1={guide.y}
			y2={guide.y}
			class="stroke-hairline"
			stroke-width="3"
			stroke-dasharray={guide.dashed ? '14 12' : undefined}
		/>
	{/each}
	{#each ghost as line, index (index)}
		<polyline
			points={points(line)}
			fill="none"
			class="stroke-ink-mute/25"
			stroke-width="10"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{/each}
	{#each current ? [...strokes, current] : strokes as line, index (index)}
		<polyline
			points={points(line.length === 1 ? [line[0], { x: line[0].x + 1, y: line[0].y }] : line)}
			fill="none"
			class="stroke-ink"
			stroke-width="10"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{/each}
</svg>
