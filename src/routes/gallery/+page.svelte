<script lang="ts">
	import { paperName, strokes, t } from '#lib/i18n.svelte.ts';
	import { onMount } from 'svelte';
	import { ImageUp, Trash2 } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import DrawPanel from '#lib/components/DrawPanel.svelte';
	import SheetPreview from '#lib/components/SheetPreview.svelte';
	import { gallery, type GalleryItem } from '#lib/gallery/store.svelte.ts';
	import { PAPER_FORMATS } from '#lib/geometry/paper.ts';
	import { design } from '#lib/design/store.svelte.ts';
	import { parseSvg } from '#lib/svg/parse.ts';
	import { settings } from '#lib/settings.svelte.ts';

	let selectedId = $state<string | undefined>();
	let confirmId = $state<string | undefined>();
	let actionError = $state('');

	const selected = $derived(gallery.items.find((item) => item.id === selectedId));

	onMount(() => {
		void gallery.load();
	});

	function select(item: GalleryItem) {
		selectedId = item.id;
		confirmId = undefined;
		settings.formatId = item.formatId;
		settings.orientation = item.orientation;
		settings.margin = item.margin;
	}

	async function openInEditor(item: GalleryItem) {
		actionError = '';
		select(item);
		const area = {
			x: item.margin,
			y: item.margin,
			width: item.sheet.width - 2 * item.margin,
			height: item.sheet.height - 2 * item.margin
		};
		try {
			if (item.source?.kind === 'svg') {
				design.addVector(parseSvg(await item.source.blob.text()), item.name, area, {
					source: item.source.blob
				});
			} else if (item.source) {
				await design.addRaster(item.source.blob, item.name, area);
			} else {
				design.addVector(item.polylines, item.name, area, { keepPosition: true });
			}
			await goto(resolve('/design'));
		} catch (error) {
			actionError = error instanceof Error ? error.message : String(error);
		}
	}

	async function remove(item: GalleryItem) {
		actionError = '';
		try {
			await gallery.remove(item.id);
			if (selectedId === item.id) selectedId = undefined;
			confirmId = undefined;
		} catch (error) {
			actionError = error instanceof Error ? error.message : String(error);
		}
	}

	const date = (time: number) =>
		new Date(time).toLocaleDateString('de-CH', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	const paper = (item: GalleryItem) =>
		`${PAPER_FORMATS.some((f) => f.id === item.formatId) ? paperName(PAPER_FORMATS.find((f) => f.id === item.formatId)!) : item.formatId} ${t(item.orientation === 'portrait' ? 'bar.portrait' : 'bar.landscape')}`;
</script>

<main
	class="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
>
	<section class="space-y-5">
		<h1 class="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">
			{t('gallery.title')}
		</h1>

		{#if gallery.error || actionError}
			<p class="text-sm text-danger" role="alert">{gallery.error || actionError}</p>
		{/if}

		{#if gallery.loaded && gallery.items.length === 0}
			<p class="rounded-lg bg-surface-card p-6 text-ink">
				{t('gallery.emptyBefore')}
				<a class="text-link underline" href={resolve('/design')}>{t('nav.design')}</a>{t(
					'gallery.emptyAfter'
				)}
			</p>
		{/if}

		<ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-2">
			{#each gallery.items as item (item.id)}
				<li
					class="flex flex-col rounded-lg border bg-canvas p-3 {selectedId === item.id
						? 'border-ink'
						: 'border-hairline'}"
				>
					<button
						class="text-left"
						onclick={() => select(item)}
						aria-pressed={selectedId === item.id}
					>
						<SheetPreview
							width={item.sheet.width}
							height={item.sheet.height}
							margin={item.margin}
							polylines={item.polylines}
						/>
						<span class="mt-2 block truncate text-sm font-semibold text-ink">{item.name}</span>
						<span class="block text-[13px] text-ink-mute">
							{date(item.createdAt)} · {paper(item)} · {strokes(item.polylines.length)}
						</span>
					</button>
					<div class="mt-3 flex flex-wrap gap-2">
						{#if confirmId === item.id}
							<span class="basis-full text-[13px] text-ink">
								{t('gallery.confirm', { name: item.name })}
							</span>
							<Button variant="stop" class="h-8! px-3!" onclick={() => remove(item)}>
								{t('gallery.delete')}
							</Button>
							<Button class="h-8! px-3!" onclick={() => (confirmId = undefined)}>
								{t('gallery.cancel')}
							</Button>
						{:else}
							<Button class="h-8! px-3!" onclick={() => openInEditor(item)}>
								<ImageUp size={14} />
								{t('gallery.open')}
							</Button>
							<Button
								variant="icon"
								class="size-8!"
								aria-label={t('gallery.deleteLabel', { name: item.name })}
								onclick={() => (confirmId = item.id)}
							>
								<Trash2 size={14} />
							</Button>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	</section>

	<section class="flex flex-col gap-4 lg:sticky lg:top-40 lg:self-start">
		{#if selected}
			<DrawPanel
				polylines={selected.polylines}
				sheet={selected.sheet}
				name={selected.name}
				saveable={false}
			/>
		{:else}
			<p class="rounded-lg border border-hairline bg-canvas p-6 text-sm text-ink-mute">
				{t('gallery.pick')}
			</p>
		{/if}
	</section>
</main>
