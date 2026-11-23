<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import DrawPanel from '#lib/components/DrawPanel.svelte';
	import { translate } from '#lib/geometry/types.ts';
	import { settings } from '#lib/settings.svelte.ts';
	import { fonts, layoutText, type Align } from '#lib/text/layout.ts';

	let text = $state(t('text.default'));
	let fontId = $state(fonts[0].id);
	let size = $state(8);
	let lineHeight = $state(1.4);
	let align = $state<Align>('left');

	const font = $derived(fonts.find((f) => f.id === fontId) ?? fonts[0]);
	const sheet = $derived(settings.sheet);
	const margin = $derived(settings.margin);
	const polylines = $derived(
		translate(
			layoutText(text, { font, size, lineHeight, align, width: sheet.width - 2 * margin }),
			margin,
			margin
		)
	);
	const field = 'h-10 w-full rounded-md border border-hairline bg-canvas px-3.5 text-ink';
	const label = 'mb-1.5 block text-[13px] font-medium text-ink-mute';
</script>

<main
	class="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]"
>
	<section class="space-y-5 rounded-lg border border-hairline bg-canvas p-6">
		<h1 class="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">
			{t('text.title')}
		</h1>

		<div>
			<label class={label} for="text">{t('text.text')}</label>
			<textarea
				id="text"
				bind:value={text}
				rows="5"
				class="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2.5 text-ink"
			></textarea>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div class="col-span-2">
				<label class={label} for="font">{t('text.font')}</label>
				<select id="font" bind:value={fontId} class={field}>
					{#each fonts as option (option.id)}
						<option value={option.id}>{option.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class={label} for="size">{t('text.size')}</label>
				<input
					id="size"
					type="number"
					min="2"
					max="80"
					step="0.5"
					bind:value={size}
					class={field}
				/>
			</div>
			<div>
				<label class={label} for="line-height">{t('text.lineHeight')}</label>
				<input
					id="line-height"
					type="number"
					min="0.8"
					max="3"
					step="0.1"
					bind:value={lineHeight}
					class={field}
				/>
			</div>
		</div>

		<div>
			<span class={label}>{t('text.alignment')}</span>
			<div class="inline-flex rounded-pill bg-surface-soft p-1.5" role="radiogroup">
				{#each [['left', t('text.left')], ['center', t('text.centre')], ['right', t('text.right')]] as [value, name] (value)}
					<button
						role="radio"
						aria-checked={align === value}
						class="rounded-pill px-3.5 py-1.5 text-sm {align === value
							? 'bg-canvas text-ink shadow-sm'
							: 'text-ink-mute'}"
						onclick={() => (align = value as Align)}
					>
						{name}
					</button>
				{/each}
			</div>
		</div>
	</section>

	<section class="flex flex-col gap-4">
		<DrawPanel {polylines} {sheet} name={text} emptyHint={t('text.empty')} />
	</section>
</main>
