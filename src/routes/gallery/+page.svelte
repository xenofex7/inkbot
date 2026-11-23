<script lang="ts">
	import { onMount } from 'svelte';
	import { ImageUp, Trash2 } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import DrawPanel from '#lib/components/DrawPanel.svelte';
	import SheetPreview from '#lib/components/SheetPreview.svelte';
	import { gallery, type GalleryItem } from '#lib/gallery/store.svelte.ts';
	import { PAPER_FORMATS } from '#lib/geometry/paper.ts';
	import { imageSource } from '#lib/image/source.svelte.ts';
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
		if (!item.source) return;
		if (item.source.kind === 'svg') imageSource.setSvg(await item.source.blob.text(), item.name);
		else imageSource.set(item.source.blob, item.name);
		await goto(resolve('/image'));
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
		`${PAPER_FORMATS.find((f) => f.id === item.formatId)?.name ?? item.formatId} ${item.orientation}`;
</script>

<main
	class="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
>
	<section class="space-y-5">
		<h1 class="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">Gallery</h1>

		{#if gallery.error || actionError}
			<p class="text-sm text-danger" role="alert">{gallery.error || actionError}</p>
		{/if}

		{#if gallery.loaded && gallery.items.length === 0}
			<p class="rounded-lg bg-surface-card p-6 text-ink">
				No drawings yet. Use "Save to gallery" on the
				<a class="text-link underline" href={resolve('/text')}>Text</a> or
				<a class="text-link underline" href={resolve('/image')}>Image</a> page and they show up here.
			</p>
		{/if}

		<ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
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
							{date(item.createdAt)} · {paper(item)} · {item.polylines.length} strokes
						</span>
					</button>
					<div class="mt-3 flex flex-wrap gap-2">
						{#if confirmId === item.id}
							<span class="basis-full text-[13px] text-ink">Delete "{item.name}"?</span>
							<Button variant="stop" class="h-8! px-3!" onclick={() => remove(item)}>Delete</Button>
							<Button class="h-8! px-3!" onclick={() => (confirmId = undefined)}>Cancel</Button>
						{:else}
							{#if item.source}
								<Button class="h-8! px-3!" onclick={() => openInEditor(item)}>
									<ImageUp size={14} /> Open in editor
								</Button>
							{/if}
							<Button
								variant="icon"
								class="size-8!"
								aria-label="Delete {item.name}"
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
				Pick a drawing to preview and plot it. The paper in the bar switches to the one it was made
				for.
			</p>
		{/if}
	</section>
</main>
