<script lang="ts">
	import { onMount } from 'svelte';
	import { notificationsApi, type NotificationDetail } from '$lib/api/client';
	import { ui } from '$lib/stores/auth';

	let notifications = $state<NotificationDetail[]>([]);
	let unreadCount = $state(0);
	let isOpen = $state(false);
	let loading = $state(false);

	async function loadNotifications() {
		loading = true;
		try {
			const res = await notificationsApi.list(20);
			notifications = res.data ?? [];
			unreadCount = (res.meta as Record<string, unknown>)?.unreadCount as number ?? notifications.filter((n) => !n.isRead).length;
		} catch {
			// silently ignore on poll/failure
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadNotifications();
		// Poll for new notifications every 30 seconds
		const interval = setInterval(loadNotifications, 30000);
		return () => clearInterval(interval);
	});

	async function handleMarkRead(notification: NotificationDetail) {
		if (notification.isRead) return;
		try {
			await notificationsApi.markAsRead(notification.id);
			notifications = notifications.map((n) =>
				n.id === notification.id ? { ...n, isRead: true } : n
			);
			unreadCount = Math.max(0, unreadCount - 1);
		} catch {
			// ignore
		}
	}

	async function handleMarkAllRead() {
		try {
			await notificationsApi.markAllAsRead();
			notifications = notifications.map((n) => ({ ...n, isRead: true }));
			unreadCount = 0;
			ui.toast.success('All marked as read');
		} catch {
			ui.toast.error('Failed to mark all as read');
		}
	}

	function toggleDropdown() {
		isOpen = !isOpen;
		if (isOpen) {
			loadNotifications();
		}
	}
</script>

<div class="notifications-container">
	<button
		type="button"
		class="bell-btn"
		onclick={toggleDropdown}
		aria-label="View notifications"
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
			<path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
		</svg>
		{#if unreadCount > 0}
			<span class="badge-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
		{/if}
	</button>

	{#if isOpen}
		<!-- Backdrop for closing dropdown -->
		<div
			class="dropdown-backdrop"
			role="button"
			tabindex="0"
			onclick={() => (isOpen = false)}
			onkeydown={(e) => e.key === 'Escape' && (isOpen = false)}
		></div>

		<div class="notifications-dropdown card">
			<div class="dropdown-header">
				<h3 class="dropdown-title">Notifications</h3>
				{#if unreadCount > 0}
					<button class="mark-all-btn" onclick={handleMarkAllRead}>
						Mark all read
					</button>
				{/if}
			</div>

			<div class="dropdown-body">
				{#if loading && notifications.length === 0}
					<div class="loading-state">
						<div class="spinner"></div>
					</div>
				{:else if notifications.length === 0}
					<div class="empty-state">
						<span class="empty-bell">🔔</span>
						<p>No notifications yet</p>
					</div>
				{:else}
					<div class="notification-list">
						{#each notifications as item}
							<a
								href={item.actionUrl || '#'}
								class="notification-item"
								class:unread={!item.isRead}
								onclick={() => {
									handleMarkRead(item);
									isOpen = false;
								}}
							>
								<div class="item-avatar">
									{#if item.actorAvatarUrl}
										<img src={item.actorAvatarUrl} alt={item.actorName || ''} />
									{:else}
										<div class="initials-avatar">
											{item.actorName ? item.actorName[0] : '🔔'}
										</div>
									{/if}
								</div>
								<div class="item-content">
									<p class="item-title">{item.title}</p>
									{#if item.body}
										<p class="item-body">{item.body}</p>
									{/if}
									<span class="item-date">
										{new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
									</span>
								</div>
								{#if !item.isRead}
									<span class="unread-dot"></span>
								{/if}
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.notifications-container {
		position: relative;
		display: inline-block;
	}

	.bell-btn {
		position: relative;
		background: none;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: var(--radius-full, 9999px);
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-primary);
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease;
	}
	.bell-btn:hover {
		background: var(--color-surface-subtle, #f9fafb);
		border-color: var(--color-neutral-300, #d1d5db);
	}

	.badge-count {
		position: absolute;
		top: -3px;
		right: -3px;
		background: var(--color-danger, #ef4444);
		color: white;
		font-size: 0.6875rem;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 9999px;
		border: 2px solid white;
		line-height: 1;
	}

	.dropdown-backdrop {
		position: fixed;
		inset: 0;
		z-index: 150;
	}

	.notifications-dropdown {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		width: 360px;
		max-height: 480px;
		background: white;
		z-index: 200;
		border-radius: var(--radius-lg, 12px);
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.dropdown-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px 18px;
		border-bottom: 1px solid var(--color-border-subtle, #f3f4f6);
	}

	.dropdown-title {
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}

	.mark-all-btn {
		background: none;
		border: none;
		font-size: 0.75rem;
		color: var(--color-primary-600, #4f46e5);
		font-weight: 600;
		cursor: pointer;
	}
	.mark-all-btn:hover { text-decoration: underline; }

	.dropdown-body {
		overflow-y: auto;
		max-height: 420px;
	}

	.notification-list {
		display: flex;
		flex-direction: column;
	}

	.notification-item {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 14px 18px;
		text-decoration: none;
		color: inherit;
		border-bottom: 1px solid var(--color-border-subtle, #f3f4f6);
		transition: background 0.15s ease;
	}
	.notification-item:hover {
		background: var(--color-surface-subtle, #f9fafb);
	}
	.notification-item.unread {
		background: #f5f3ff;
	}

	.item-avatar {
		width: 36px;
		height: 36px;
		border-radius: 9999px;
		overflow: hidden;
		flex-shrink: 0;
		background: var(--color-primary-100, #e0e7ff);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.item-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.initials-avatar {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-primary-700, #4338ca);
	}

	.item-content {
		flex: 1;
		min-width: 0;
	}

	.item-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 2px;
		line-height: 1.3;
	}

	.item-body {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		margin: 0 0 4px;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.item-date {
		font-size: 0.6875rem;
		color: var(--color-text-tertiary);
	}

	.unread-dot {
		width: 8px;
		height: 8px;
		border-radius: 9999px;
		background: var(--color-primary-600, #4f46e5);
		margin-top: 6px;
		flex-shrink: 0;
	}

	.empty-state {
		padding: 36px;
		text-align: center;
		color: var(--color-text-tertiary);
		font-size: 0.875rem;
	}
	.empty-bell {
		font-size: 2rem;
		display: block;
		margin-bottom: 8px;
	}

	.loading-state {
		padding: 32px;
		display: flex;
		justify-content: center;
	}
	.spinner {
		width: 24px;
		height: 24px;
		border: 3px solid #e0e7ff;
		border-top-color: #4f46e5;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
