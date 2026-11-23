<script lang="ts">
	import { PAPER_FORMATS, type Orientation } from '../geometry/paper';
	import { paperName, t } from '../i18n.svelte';
	import { settings } from '../settings.svelte';

	let { idPrefix }: { idPrefix: string } = $props();

	const field = 'h-9 rounded-md border border-hairline bg-canvas px-2.5 text-sm text-ink';
</script>

<div class="flex flex-wrap items-center gap-2">
	<select
		id="{idPrefix}-format"
		aria-label={t('bar.paper')}
		bind:value={settings.formatId}
		class={field}
	>
		{#each PAPER_FORMATS as option (option.id)}
			<option value={option.id}>{paperName(option)}</option>
		{/each}
	</select>
	<select
		id="{idPrefix}-orientation"
		aria-label={t('bar.orientation')}
		value={settings.orientation}
		onchange={(event) => (settings.orientation = event.currentTarget.value as Orientation)}
		class={field}
	>
		<option value="portrait">{t('bar.portrait')}</option>
		<option value="landscape">{t('bar.landscape')}</option>
	</select>
	<label class="flex items-center gap-1.5 text-ink-mute" for="{idPrefix}-margin">
		{t('bar.margin')}
		<input
			id="{idPrefix}-margin"
			type="number"
			min="0"
			max="60"
			bind:value={settings.margin}
			class="{field} w-16"
		/>
	</label>
</div>
