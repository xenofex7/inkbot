<script lang="ts">
	import { t } from '../i18n.svelte';
	import { plotter } from '../serial/plotter.svelte';

	const label = $derived.by(() => {
		if (plotter.connection === 'connecting')
			return { text: t('status.connecting'), tone: 'default' };
		if (plotter.connection === 'disconnected')
			return { text: t('status.disconnected'), tone: 'default' };
		if (plotter.alarm !== undefined) return { text: t('status.alarm'), tone: 'danger' };
		if (plotter.penDown) return { text: t('status.penDown'), tone: 'seal' };
		if (plotter.status?.state === 'Hold') return { text: t('status.paused'), tone: 'warning' };
		if (plotter.busy) return { text: t('status.moving'), tone: 'brand' };
		return { text: t('status.connected'), tone: 'brand' };
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
