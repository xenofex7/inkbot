<script lang="ts" module>
	const STORAGE_KEY = 'inkbot.panels';

	function readPanels(): Record<string, boolean> {
		try {
			return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, boolean>;
		} catch {
			return {};
		}
	}

	function savePanel(id: string, open: boolean) {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readPanels(), [id]: open }));
		} catch {
			return;
		}
	}
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { ChevronDown } from '@lucide/svelte';

	let {
		id,
		title,
		open = true,
		large = false,
		bodyClass = 'space-y-4',
		actions,
		children
	}: {
		id: string;
		title: string;
		open?: boolean;
		large?: boolean;
		bodyClass?: string;
		actions?: Snippet;
		children: Snippet;
	} = $props();

	let expanded = $state(untrack(() => readPanels()[id] ?? open));

	function toggle() {
		expanded = !expanded;
		savePanel(id, expanded);
	}
</script>

<section class="rounded-lg border border-hairline bg-canvas py-6 pr-6 pl-9">
	<div class="flex items-center justify-between gap-3">
		<button
			type="button"
			class="-ml-5.5 flex min-w-0 items-center gap-1.5 rounded-md text-left"
			aria-expanded={expanded}
			onclick={toggle}
		>
			<ChevronDown
				size={16}
				class="shrink-0 text-ink-mute transition-transform {expanded ? '' : '-rotate-90'}"
			/>
			{#if large}
				<h1 class="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">{title}</h1>
			{:else}
				<h2 class="font-semibold text-ink">{title}</h2>
			{/if}
		</button>
		{@render actions?.()}
	</div>
	{#if expanded}
		<div class="mt-4 {bodyClass}">
			{@render children()}
		</div>
	{/if}
</section>
