<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	import Toast from '$lib/components/ui/Toast.svelte';

	interface Props {
		children: import('svelte').Snippet;
	}
	let { children }: Props = $props();

	// Initialize auth state from stored tokens on first load
	onMount(async () => {
		await authStore.initialize();
	});
</script>

<svelte:head>
	<title>CollabSphere — Student Collaboration Platform</title>
</svelte:head>

{@render children()}

<!-- Global toast notifications -->
<Toast />
