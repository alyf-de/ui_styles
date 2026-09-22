/**
 * Sticky list column header under page head (tracks Desk tuck/untuck).
 *
 * Per-list gate: .frappe-list.list-sticky-header (requires dense on that list).
 * Registers whenever list_scroll.any_dense is on; no-ops for lists without sticky.
 *
 * Exposes on ui_styles.list_scroll: apply_sticky_top, watch_page_head,
 * follow_page_head_top (called from list_scroll_sync.js).
 */
frappe.provide("ui_styles.list_scroll");

(() => {
	if (!frappe.boot?.list_scroll?.any_dense) {
		return;
	}

	const api = ui_styles.list_scroll;

	// Desk throttles page-head tuck at 500ms then transitions top for 0.5s
	const PAGE_HEAD_TOP_MS = 1000;

	let sticky_coalesce_raf = null;
	let sticky_follow_raf = null;
	let sticky_follow_until = 0;
	let page_head_watcher = null;
	let watched_page_head = null;

	/**
	 * Desk keeps one .page-head per page-container; inactive pages stay in the
	 * DOM. Always use the visible head in the active container.
	 */
	function get_active_page_head() {
		const heads = document.querySelectorAll(".page-head");
		let fallback = null;
		for (const head of heads) {
			const container = head.closest(".page-container");
			if (container) {
				const hidden =
					container.classList.contains("hide") ||
					window.getComputedStyle(container).display === "none";
				if (hidden) {
					continue;
				}
			}
			if (head.getClientRects().length > 0) {
				return head;
			}
			fallback = fallback || head;
		}
		return fallback;
	}

	/**
	 * Pin sticky list headers to the live bottom edge of .page-head.flex (and
	 * never above .sticky-top). Tracks page-head while Desk animates top on tuck.
	 */
	function apply_list_head_sticky_top() {
		const sticky = document.querySelector(".sticky-top");
		const page_head = get_active_page_head();
		const sticky_bottom = sticky ? sticky.getBoundingClientRect().bottom : 0;
		let top = sticky_bottom;
		if (page_head && page_head.getClientRects().length > 0) {
			const head_bottom = page_head.getBoundingClientRect().bottom;
			// Keep under the visible page-head bar (incl. while it transitions)
			top = Math.max(sticky_bottom, head_bottom);
		}
		const top_px = `${Math.round(top)}px`;
		document
			.querySelectorAll(".frappe-list.list-sticky-header .list-row-head")
			.forEach((head) => {
				if (head.style.top !== top_px) {
					head.style.top = top_px;
				}
			});
		// Clear leftover top on lists that no longer use sticky header
		document
			.querySelectorAll(".frappe-list:not(.list-sticky-header) .list-row-head")
			.forEach((head) => {
				if (head.style.top) {
					head.style.removeProperty("top");
				}
			});
	}

	function follow_page_head_top(duration_ms = PAGE_HEAD_TOP_MS) {
		sticky_follow_until = Math.max(sticky_follow_until, performance.now() + duration_ms);
		if (sticky_follow_raf) {
			return;
		}
		const tick = (now) => {
			apply_list_head_sticky_top();
			if (now < sticky_follow_until) {
				sticky_follow_raf = requestAnimationFrame(tick);
			} else {
				sticky_follow_raf = null;
				apply_list_head_sticky_top();
			}
		};
		sticky_follow_raf = requestAnimationFrame(tick);
	}

	function ensure_page_head_watch() {
		const page_head = get_active_page_head();
		if (!page_head) {
			return;
		}
		if (page_head === watched_page_head && page_head_watcher) {
			return;
		}
		if (page_head_watcher) {
			page_head_watcher.disconnect();
			page_head_watcher = null;
		}
		watched_page_head = page_head;
		page_head_watcher = new MutationObserver(() => {
			// Desk sets inline top then CSS transitions for 0.5s (after throttle)
			follow_page_head_top(PAGE_HEAD_TOP_MS);
		});
		page_head_watcher.observe(page_head, {
			attributes: true,
			attributeFilter: ["style", "class"],
		});
		apply_list_head_sticky_top();
	}

	function queue_sticky_sync() {
		ensure_page_head_watch();
		// While following a page-head transition, the rAF loop already applies
		if (sticky_follow_raf) {
			return;
		}
		if (sticky_coalesce_raf) {
			return;
		}
		sticky_coalesce_raf = requestAnimationFrame(() => {
			sticky_coalesce_raf = null;
			apply_list_head_sticky_top();
		});
	}

	function watch_page_head() {
		watched_page_head = null;
		ensure_page_head_watch();
		follow_page_head_top(PAGE_HEAD_TOP_MS);
	}

	api.apply_sticky_top = apply_list_head_sticky_top;
	api.watch_page_head = watch_page_head;
	api.follow_page_head_top = follow_page_head_top;

	window.addEventListener("scroll", queue_sticky_sync, { passive: true });

	watch_page_head();
})();
