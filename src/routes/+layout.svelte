<script lang="ts">
	import './layout.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href="favicon.png" />
	<title>inkbot</title>
</svelte:head>

{@render children()}
