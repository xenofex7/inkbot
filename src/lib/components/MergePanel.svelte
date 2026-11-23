<script lang="ts">
	import { t } from '../i18n.svelte';
	import { ChevronLeft, ChevronRight, FileSpreadsheet, X } from '@lucide/svelte';
	import Button from './Button.svelte';
	import Panel from './Panel.svelte';
	import { decodeText, hasPlaceholders, toMergeList } from '../design/merge';
	import { design } from '../design/store.svelte';

	let error = $state('');
	let input: HTMLInputElement;

	const merge = $derived(design.merge);
	const selectedText = $derived(design.selected?.kind === 'text' ? design.selected : undefined);
	const linked = $derived(
		design.elements.some(
			(element) => element.kind === 'text' && hasPlaceholders(element.options.text)
		)
	);
	const preview = $derived(
		design.mergeRow && merge ? (design.mergeRow[merge.columns[0]] ?? '') : ''
	);

	async function load(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = '';
		if (!file) return;
		error = '';
		try {
			const list = toMergeList(decodeText(await file.arrayBuffer()));
			if (list.rows.length === 0) throw new Error(t('merge.empty'));
			design.setMerge(list);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	function insert(column: string) {
		const element = selectedText;
		if (!element || element.kind !== 'text') return;
		const text = element.options.text;
		const joiner = text === '' || text.endsWith('\n') ? '' : ' ';
		design.updateText(element.id, { ...element.options, text: `${text}${joiner}{${column}}` });
	}
</script>

<Panel id="design-merge" title={t('merge.title')} open={false}>
	<p class="text-sm text-ink-mute">{t('merge.intro')}</p>

	{#if !merge}
		<Button onclick={() => input.click()}>
			<FileSpreadsheet size={16} />
			{t('merge.load')}
		</Button>
	{:else}
		<div>
			<p class="mb-1.5 text-[13px] font-medium text-ink-mute">
				{selectedText ? t('merge.columnsInsert') : t('merge.columns')}
			</p>
			<div class="flex flex-wrap gap-1.5">
				{#each merge.columns as column (column)}
					<button
						type="button"
						class="rounded-pill border border-hairline bg-surface-card px-2.5 py-1 font-mono text-[12px] text-ink disabled:cursor-default"
						disabled={!selectedText}
						onclick={() => insert(column)}
					>
						{`{${column}}`}
					</button>
				{/each}
			</div>
		</div>

		{#if !linked}
			<p class="text-[13px] text-ink-mute">{t('merge.noPlaceholder')}</p>
		{/if}

		<div class="flex items-center gap-2">
			<Button variant="icon" onclick={() => design.stepMerge(-1)} aria-label={t('merge.previous')}>
				<ChevronLeft size={18} />
			</Button>
			<div class="min-w-0 flex-1 text-center text-sm">
				<div class="font-semibold text-ink">
					{t('merge.position', { index: design.mergeIndex + 1, count: merge.rows.length })}
				</div>
				<div class="truncate text-ink-mute">{preview}</div>
			</div>
			<Button variant="icon" onclick={() => design.stepMerge(1)} aria-label={t('merge.next')}>
				<ChevronRight size={18} />
			</Button>
		</div>
		<p class="text-[13px] text-ink-mute">{t('merge.flow')}</p>
		<Button onclick={() => design.setMerge(undefined)}>
			<X size={16} />
			{t('merge.remove')}
		</Button>
	{/if}

	{#if error}
		<p class="text-sm text-danger" role="alert">{error}</p>
	{/if}

	<input
		bind:this={input}
		type="file"
		accept=".csv,text/csv,text/plain"
		class="hidden"
		onchange={load}
	/>
</Panel>
