<script lang="ts">
	import { extent, place, scaleFromCorner, type Placement } from '../design/model';
	import { design, type DesignElement } from '../design/store.svelte';
	import type { Point } from '../geometry/types';
	import { simplify } from '../image/trace';
	import { t, type MessageKey } from '../i18n.svelte';
	import { settings } from '../settings.svelte';
	import { penColor } from '../design/pens';

	let {
		width,
		height,
		margin,
		pen
	}: { width: number; height: number; margin: number; pen?: Point } = $props();

	let svg = $state<SVGSVGElement>();
	let drag: { id: string; mode: 'move' | 'scale'; start: Point; origin: Placement } | undefined;
	let stroke = $state<Point[] | undefined>();
	let hover = $state<Point | undefined>();
	let lastErase: Point | undefined;

	const radius = $derived(design.eraserSize / 2);

	const HANDLE = 3.5;

	const guides = $derived(
		design.guides &&
			design.guides.formatId === settings.formatId &&
			design.guides.orientation === settings.orientation
			? design.guides
			: undefined
	);

	function toSheet(event: PointerEvent): Point {
		const matrix = svg?.getScreenCTM();
		if (!svg || !matrix) return { x: 0, y: 0 };
		const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
		return { x: point.x, y: point.y };
	}

	function start(event: PointerEvent, element: DesignElement, mode: 'move' | 'scale') {
		event.stopPropagation();
		event.preventDefault();
		design.selectedId = element.id;
		drag = {
			id: element.id,
			mode,
			start: toSheet(event),
			origin: { x: element.x, y: element.y, scale: element.scale, rotation: element.rotation }
		};
		svg?.setPointerCapture(event.pointerId);
	}

	function down(event: PointerEvent) {
		if (design.tool === 'select') {
			design.selectedId = undefined;
			return;
		}
		event.preventDefault();
		svg?.setPointerCapture(event.pointerId);
		const point = toSheet(event);
		if (design.tool === 'draw') stroke = [point];
		else eraseAt(point);
	}

	function eraseAt(point: Point) {
		lastErase = point;
		design.erase(point, radius);
	}

	function moveTo(event: PointerEvent) {
		const current = toSheet(event);
		hover = current;
		if (stroke) {
			stroke = [...stroke, current];
			return;
		}
		if (design.tool === 'erase' && lastErase) {
			if (Math.hypot(current.x - lastErase.x, current.y - lastErase.y) > radius / 2)
				eraseAt(current);
			return;
		}
		if (!drag) return;
		const element = design.view.find((e) => e.id === drag?.id);
		if (!element) return;
		if (drag.mode === 'move') {
			design.move(drag.id, {
				...drag.origin,
				x: drag.origin.x + current.x - drag.start.x,
				y: drag.origin.y + current.y - drag.start.y
			});
		} else {
			design.move(drag.id, scaleFromCorner(element.shape, drag.origin, current));
		}
	}

	function end(event: PointerEvent) {
		if (svg?.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
		if (stroke) design.addFreehand(simplify(stroke, 0.1), t('design.freehand'));
		stroke = undefined;
		lastErase = undefined;
		drag = undefined;
	}

	const points = (line: Point[]) => line.map((p) => `${p.x},${p.y}`).join(' ');
</script>

<svg
	bind:this={svg}
	viewBox="-6 -6 {width + 12} {height + 12}"
	class="h-auto max-h-[70vh] w-full touch-none select-none"
	style="cursor: {design.tool === 'draw'
		? 'crosshair'
		: design.tool === 'erase'
			? 'none'
			: 'default'}"
	role="application"
	aria-label={t('preview.label', { width, height })}
	onpointerdown={down}
	onpointerleave={() => (hover = undefined)}
	onpointermove={moveTo}
	onpointerup={end}
	onpointercancel={end}
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
	{#if guides}
		{#each guides.lines as line, index (index)}
			<polyline
				points={points(line)}
				fill="none"
				class="stroke-seal/50"
				stroke-width="0.35"
				stroke-dasharray="2.5 1.5"
			/>
		{/each}
		{#each guides.labels as guide (guide.key + guide.x + guide.y)}
			<text
				x={guide.x}
				y={guide.y}
				text-anchor="middle"
				dominant-baseline="middle"
				class="fill-seal/70"
				font-size="3"
			>
				{t(guide.key as MessageKey)}
			</text>
		{/each}
	{/if}
	{#each design.view as element (element.id)}
		{@const size = extent(element.shape, element.rotation)}
		{@const w = size.width * element.scale}
		{@const h = size.height * element.scale}
		<g>
			{#each place(element.shape, element) as line, index (index)}
				<polyline
					points={points(line)}
					fill="none"
					stroke={penColor(element.pen)}
					stroke-width="0.35"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			{/each}
			<rect
				x={element.x}
				y={element.y}
				width={Math.max(w, 1)}
				height={Math.max(h, 1)}
				fill="transparent"
				class={design.selectedId === element.id ? 'stroke-steel-600' : 'stroke-transparent'}
				stroke-width="0.4"
				stroke-dasharray="1.2 1"
				style="cursor: move; pointer-events: {design.tool === 'select' ? 'auto' : 'none'}"
				role="button"
				tabindex="-1"
				aria-label={element.name}
				onpointerdown={(event) => start(event, element, 'move')}
			/>
			{#if design.selectedId === element.id && design.tool === 'select'}
				<rect
					x={element.x + w - HANDLE / 2}
					y={element.y + h - HANDLE / 2}
					width={HANDLE}
					height={HANDLE}
					rx="0.6"
					class="fill-canvas stroke-steel-600"
					stroke-width="0.4"
					style="cursor: nwse-resize"
					role="button"
					tabindex="-1"
					aria-label={t('design.resize')}
					onpointerdown={(event) => start(event, element, 'scale')}
				/>
			{/if}
		</g>
	{/each}
	{#if stroke}
		<polyline
			points={points(stroke)}
			fill="none"
			stroke={penColor(1)}
			stroke-width="0.35"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{/if}
	{#if design.tool === 'erase' && hover}
		<circle
			cx={hover.x}
			cy={hover.y}
			r={radius}
			fill="none"
			class="stroke-seal"
			stroke-width="0.3"
			pointer-events="none"
		/>
	{/if}
	<circle cx="0" cy="0" r="1.4" class="fill-seal" />
	{#if pen}
		<circle cx={pen.x} cy={pen.y} r="1.2" class="fill-seal" opacity="0.8" />
	{/if}
</svg>
