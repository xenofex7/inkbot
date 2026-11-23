<script lang="ts">
	import { encode } from 'uqr';

	let { value, label }: { value: string; label: string } = $props();

	const QUIET = 2;
	const qr = $derived(encode(value, { border: 0 }));
	const path = $derived(
		qr.data
			.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x + QUIET} ${y + QUIET}h1v1h-1z` : '')))
			.join('')
	);
</script>

<svg
	viewBox="0 0 {qr.size + 2 * QUIET} {qr.size + 2 * QUIET}"
	class="w-full rounded-md bg-white"
	shape-rendering="crispEdges"
	role="img"
	aria-label={label}
>
	<path d={path} fill="#000" />
</svg>
