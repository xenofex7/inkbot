<script lang="ts">
	import { resolve } from '$app/paths';
	import { t } from '#lib/i18n.svelte.ts';
	import {
		ChevronLeft,
		ChevronRight,
		Eraser,
		Plus,
		QrCode as QrIcon,
		Share,
		Trash2,
		Undo2,
		Upload,
		X
	} from '@lucide/svelte';
	import Button from '#lib/components/Button.svelte';
	import HandPad from '#lib/components/HandPad.svelte';
	import QrCode from '#lib/components/QrCode.svelte';
	import { download, filenameFrom } from '#lib/download.ts';
	import type { Point } from '#lib/geometry/types.ts';
	import {
		CHARSET,
		MAX_VARIANTS,
		PAD,
		fromFile,
		glyphFromStrokes,
		glyphStrokes,
		toFile,
		toFont,
		type Handwriting
	} from '#lib/handwriting/model.ts';
	import { handwriting } from '#lib/handwriting/store.svelte.ts';
	import { bounds } from '#lib/geometry/types.ts';
	import { layoutText, type Glyph } from '#lib/text/layout.ts';

	let activeId = $state<string | undefined>();
	let char = $state(CHARSET[0]);
	let strokes = $state<Point[][]>([]);
	let showQr = $state(false);
	let sample = $state(t('hand.sampleText'));
	let error = $state('');
	let importInput: HTMLInputElement;

	$effect(() => {
		void handwriting.load();
	});

	const active = $derived(
		handwriting.items.find((item) => item.id === activeId) ?? handwriting.items[0]
	);
	const variants = $derived(active?.glyphs[char] ?? []);
	const done = $derived(
		active ? CHARSET.filter((c) => (active.glyphs[c]?.length ?? 0) > 0).length : 0
	);
	const pageUrl = $derived(
		typeof location === 'undefined' ? '' : new URL(resolve('/handwriting'), location.href).href
	);

	const preview = $derived.by(() => {
		if (!active || !sample.trim()) return undefined;
		const lines = layoutText(sample, {
			font: toFont(active),
			size: 10,
			lineHeight: 1.5,
			align: 'left',
			width: 1000
		});
		const box = bounds(lines);
		return box ? { lines, box } : undefined;
	});

	async function run(action: () => Promise<unknown>) {
		error = '';
		try {
			await action();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	function create() {
		void run(async () => {
			const item = await handwriting.save({
				id: crypto.randomUUID(),
				name: t('hand.defaultName', { number: handwriting.items.length + 1 }),
				createdAt: Date.now(),
				updatedAt: Date.now(),
				glyphs: {}
			});
			activeId = item.id;
			char = CHARSET[0];
			strokes = [];
		});
	}

	function update(change: (item: Handwriting) => Handwriting) {
		const current = active;
		if (current) void run(() => handwriting.save(change($state.snapshot<Handwriting>(current))));
	}

	function select(next: string) {
		char = next;
		strokes = [];
	}

	function step(offset: number) {
		const index = CHARSET.indexOf(char);
		select(CHARSET[(index + offset + CHARSET.length) % CHARSET.length]);
	}

	function saveGlyph() {
		const glyph = glyphFromStrokes(strokes);
		if (!glyph) return;
		update((item) => ({
			...item,
			glyphs: { ...item.glyphs, [char]: [...(item.glyphs[char] ?? []), glyph].slice(-MAX_VARIANTS) }
		}));
		strokes = [];
		if (variants.length + 1 >= MAX_VARIANTS) step(1);
	}

	function removeVariant(index: number) {
		update((item) => ({
			...item,
			glyphs: { ...item.glyphs, [char]: (item.glyphs[char] ?? []).filter((_, i) => i !== index) }
		}));
	}

	function removeHandwriting() {
		const current = active;
		if (!current || !confirm(t('hand.deleteConfirm', { name: current.name }))) return;
		void run(() => handwriting.remove(current.id));
		activeId = undefined;
	}

	function share() {
		const current = active;
		if (!current) return;
		void run(async () => {
			const filename = filenameFrom(current.name, 'json');
			const file = new File([toFile(current)], filename, { type: 'application/json' });
			if (navigator.canShare?.({ files: [file] })) {
				await navigator.share({ files: [file], title: current.name });
			} else {
				download(file, filename);
			}
		});
	}

	function importFile(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = '';
		if (!file) return;
		void run(async () => {
			const item = await handwriting.save(fromFile(await file.text()));
			activeId = item.id;
		});
	}

	const thumb = (glyph: Glyph) =>
		glyphStrokes(glyph).map((line) => line.map((p) => `${p.x},${p.y}`).join(' '));

	const field = 'h-10 w-full rounded-md border border-hairline bg-canvas px-3.5 text-ink';
	const label = 'mb-1.5 block text-[13px] font-medium text-ink-mute';
</script>

<main
	class="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
>
	<section class="space-y-5 max-lg:contents">
		<div class="space-y-4 rounded-lg border border-hairline bg-canvas p-6">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h1 class="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">
					{t('hand.title')}
				</h1>
				<Button onclick={() => (showQr = !showQr)} aria-expanded={showQr}>
					<QrIcon size={16} />
					{t('hand.phone')}
				</Button>
			</div>
			<p class="text-sm text-ink-mute">{t('hand.intro')}</p>

			{#if showQr}
				<div class="flex flex-wrap items-start gap-4 rounded-md bg-surface-card p-4">
					<div class="w-36 shrink-0">
						<QrCode value={pageUrl} label={t('hand.qrLabel')} />
					</div>
					<ol class="min-w-48 flex-1 list-decimal space-y-1 pl-4 text-sm text-ink">
						<li>{t('hand.phoneStep1')}</li>
						<li>{t('hand.phoneStep2')}</li>
						<li>{t('hand.phoneStep3')}</li>
						<li>{t('hand.phoneStep4')}</li>
					</ol>
				</div>
			{/if}

			{#if handwriting.items.length > 0}
				<div>
					<label class={label} for="hand-select">{t('hand.choose')}</label>
					<select
						id="hand-select"
						class={field}
						value={active?.id}
						onchange={(event) => {
							activeId = event.currentTarget.value;
							strokes = [];
						}}
					>
						{#each handwriting.items as item (item.id)}
							<option value={item.id}>{item.name}</option>
						{/each}
					</select>
				</div>
			{/if}

			{#if active}
				<div>
					<label class={label} for="hand-name">{t('hand.name')}</label>
					<input
						id="hand-name"
						class={field}
						value={active.name}
						onchange={(event) => {
							const name = event.currentTarget.value.trim();
							if (name) update((item) => ({ ...item, name }));
						}}
					/>
				</div>
			{/if}

			<div class="flex flex-wrap gap-2">
				<Button variant={active ? 'secondary' : 'primary'} onclick={create}>
					<Plus size={16} />
					{t('hand.new')}
				</Button>
				{#if active}
					<Button onclick={share}>
						<Share size={16} />
						{t('hand.share')}
					</Button>
				{/if}
				<Button onclick={() => importInput.click()}>
					<Upload size={16} />
					{t('hand.import')}
				</Button>
				{#if active}
					<Button
						variant="icon"
						class="size-10!"
						onclick={removeHandwriting}
						aria-label={t('hand.delete')}
					>
						<Trash2 size={16} />
					</Button>
				{/if}
				<input
					bind:this={importInput}
					type="file"
					accept="application/json,.json"
					class="hidden"
					onchange={importFile}
				/>
			</div>

			{#if error || handwriting.error}
				<p class="text-sm text-danger" role="alert">{error || handwriting.error}</p>
			{/if}
		</div>

		{#if active}
			<div class="space-y-3 rounded-lg border border-hairline bg-canvas p-6 max-lg:order-last">
				<div class="flex items-baseline justify-between gap-3">
					<h2 class="font-display text-lg font-semibold text-ink">{t('hand.characters')}</h2>
					<span class="text-[13px] text-ink-mute">
						{t('hand.progress', { done, total: CHARSET.length })}
					</span>
				</div>
				<div class="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5">
					{#each CHARSET as option (option)}
						{@const count = active.glyphs[option]?.length ?? 0}
						<button
							type="button"
							class="relative h-10 rounded-md border text-base {option === char
								? 'border-ink bg-canvas text-ink'
								: count > 0
									? 'border-hairline bg-steel-50 text-ink'
									: 'border-hairline bg-canvas text-ink-mute'}"
							aria-pressed={option === char}
							onclick={() => select(option)}
						>
							{option}
							{#if count > 0}
								<span class="absolute right-1 bottom-0.5 text-[10px] text-ink-mute">{count}</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</section>

	{#if active}
		<section class="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
			<div class="space-y-4 rounded-lg border border-hairline bg-canvas p-6">
				<div class="flex items-center justify-between gap-3">
					<Button variant="icon" onclick={() => step(-1)} aria-label={t('hand.previous')}>
						<ChevronLeft size={18} />
					</Button>
					<div class="text-center">
						<div class="font-display text-3xl font-semibold text-ink">{char}</div>
						<div class="text-[13px] text-ink-mute">
							{t('hand.variants', { count: variants.length, max: MAX_VARIANTS })}
						</div>
					</div>
					<Button variant="icon" onclick={() => step(1)} aria-label={t('hand.next')}>
						<ChevronRight size={18} />
					</Button>
				</div>

				<HandPad
					bind:strokes
					ghost={variants[0] ? glyphStrokes(variants[0]) : []}
					label={t('hand.pad', { char })}
				/>
				<p class="text-[13px] text-ink-mute">{t('hand.padHint')}</p>

				<div class="flex flex-wrap gap-2">
					<Button variant="primary" onclick={saveGlyph} disabled={strokes.length === 0}>
						<Plus size={16} />
						{t('hand.save')}
					</Button>
					<Button onclick={() => (strokes = strokes.slice(0, -1))} disabled={strokes.length === 0}>
						<Undo2 size={16} />
						{t('hand.undo')}
					</Button>
					<Button onclick={() => (strokes = [])} disabled={strokes.length === 0}>
						<Eraser size={16} />
						{t('hand.clear')}
					</Button>
				</div>

				{#if variants.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each variants as glyph, index (index)}
							<div class="relative w-20">
								<svg
									viewBox="0 0 {PAD.size} {PAD.size}"
									class="w-full rounded-md border border-hairline bg-surface-card"
								>
									{#each thumb(glyph) as points, i (i)}
										<polyline
											{points}
											fill="none"
											class="stroke-ink"
											stroke-width="24"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									{/each}
								</svg>
								<button
									type="button"
									class="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border border-hairline bg-canvas text-ink-mute hover:text-ink"
									aria-label={t('hand.removeVariant')}
									onclick={() => removeVariant(index)}
								>
									<X size={12} />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="space-y-3 rounded-lg border border-hairline bg-canvas p-6">
				<label class={label} for="hand-sample">{t('hand.sample')}</label>
				<input id="hand-sample" class={field} bind:value={sample} />
				{#if preview}
					<svg
						viewBox="{preview.box.minX - 2} {preview.box.minY - 2} {preview.box.maxX -
							preview.box.minX +
							4} {preview.box.maxY - preview.box.minY + 4}"
						class="max-h-48 w-full rounded-md bg-surface-card"
						role="img"
						aria-label={sample}
					>
						{#each preview.lines as line, index (index)}
							<polyline
								points={line.map((p) => `${p.x},${p.y}`).join(' ')}
								fill="none"
								class="stroke-ink"
								stroke-width="1.5"
								vector-effect="non-scaling-stroke"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						{/each}
					</svg>
				{/if}
				<p class="text-[13px] text-ink-mute">{t('hand.sampleHint')}</p>
			</div>
		</section>
	{/if}
</main>
