<script lang="ts">
	import { plotter } from '../serial/plotter.svelte';

	const label = $derived.by(() => {
		if (plotter.connection === 'connecting') return { text: 'Connecting …', tone: 'default' };
		if (plotter.connection === 'disconnected') return { text: 'Disconnected', tone: 'default' };
		if (plotter.alarm !== undefined) return { text: 'Alarm', tone: 'danger' };
		if (plotter.penDown) return { text: 'Pen down', tone: 'seal' };
		if (plotter.status?.state === 'Hold') return { text: 'Paused', tone: 'warning' };
		if (plotter.busy) return { text: 'Moving', tone: 'brand' };
		return { text: 'Connected', tone: 'brand' };
	});

	const tones: Record<string, string> = {
		default: 'bg-surface-card text-ink',
		brand: 'bg-steel-50 text-ink',
		warning: 'bg-surface-card text-ink',
		danger: 'bg-danger text-on-primary',
		seal: 'bg-seal text-on-primary'
	};

	const dots: Record<string, string> = {
		default: 'bg-ink-mute',
		brand: 'bg-steel-600',
		warning: 'bg-warning',
		danger: 'bg-on-primary',
		seal: 'bg-on-primary'
	};
</script>

<span
	class="inline-flex items-center gap-2 rounded-pill px-3 py-1 text-[13px] font-medium {tones[
		label.tone
	]}"
	role="status"
>
	<span class="size-2 rounded-full {dots[label.tone]}"></span>
	{label.text}
</span>
