<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'stop' | 'icon';

	let {
		variant = 'secondary',
		children,
		class: className = '',
		...rest
	}: HTMLButtonAttributes & { variant?: Variant; children: Snippet } = $props();

	const variants: Record<Variant, string> = {
		primary: 'h-10 px-5 bg-primary text-on-primary active:bg-primary-active',
		secondary: 'h-10 px-5 bg-canvas text-ink border border-hairline active:bg-surface-soft',
		stop: 'h-10 px-5 bg-danger text-on-primary active:brightness-90',
		icon: 'size-9 justify-center rounded-full bg-canvas text-ink border border-hairline active:bg-surface-soft'
	};
</script>

<button
	type="button"
	class="inline-flex items-center gap-2 rounded-md text-sm font-semibold transition-colors duration-100 ease-standard disabled:cursor-not-allowed disabled:bg-surface-strong disabled:text-ink-mute {variants[
		variant
	]} {className}"
	{...rest}
>
	{@render children()}
</button>
