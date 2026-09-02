/**
 * Floating list paging bar fixed over the list at the natural bottom inset.
 *
 * Gated by List Scroll Settings → Floating List Paging
 * (frappe.boot.list_scroll.floating_list_paging). Requires dense layout.
 *
 * Exposes on ui_styles.list_scroll: ensure_or_refresh_floating_paging,
 * layout_all_floating_paging, reset_floating_inset (called from list_scroll_sync.js).
 */
frappe.provide("ui_styles.list_scroll");

(() => {
	if (!frappe.boot?.list_scroll?.dense_list_layout) {
		return;
	}
	if (!frappe.boot.list_scroll.floating_list_paging) {
		return;
	}

	const api = ui_styles.list_scroll;
	document.documentElement.classList.add("list-floating-paging");

	const PAGING_FLOAT = "list-paging-floating";
	const PAGING_SPACER = "list-paging-spacer";

	// Per paging element: a shared module inset would mis-place later lists
	// when several .frappe-list areas are visible at different document positions.
	const paging_bottom_insets = new WeakMap();

	function clear_paging_insets() {
		document.querySelectorAll(".frappe-list > .list-paging-area").forEach((paging) => {
			paging_bottom_insets.delete(paging);
		});
	}

	function ensure_paging_spacer(list, paging) {
		let spacer = list.querySelector(`:scope > .${PAGING_SPACER}`);
		if (!spacer) {
			api.with_dom_mutation(() => {
				spacer = document.createElement("div");
				spacer.className = PAGING_SPACER;
				list.insertBefore(spacer, paging);
			});
		}
		return spacer;
	}

	function natural_paging_bottom_inset(paging) {
		// Gap between paging bottom and document end (= viewport gap when
		// scrolled to the end). Keeps floating bar at the same window inset.
		const paging_doc_bottom = window.scrollY + paging.getBoundingClientRect().bottom;
		const doc_bottom = document.documentElement.scrollHeight;
		return Math.max(0, Math.round(doc_bottom - paging_doc_bottom));
	}

	function clear_floating_paging(paging) {
		paging.classList.remove(PAGING_FLOAT);
		paging.style.left = "";
		paging.style.width = "";
		paging.style.bottom = "";
		const list = paging.closest(".frappe-list");
		const spacer = list?.querySelector(`:scope > .${PAGING_SPACER}`);
		if (spacer) {
			spacer.style.height = "0px";
		}
	}

	/**
	 * Lightweight: only update left/width of an already-fixed paging bar
	 * (no unfix / spacer reflow — that desyncs sticky header from page-head).
	 * Pass scope=null to refresh every list.
	 */
	function refresh_floating_paging_box(scope) {
		const lists = scope
			? [
					scope.classList?.contains("frappe-list")
						? scope
						: scope.querySelector?.(".frappe-list"),
			  ].filter(Boolean)
			: Array.from(document.querySelectorAll(".frappe-list"));
		lists.forEach((list) => {
			list.querySelectorAll(`:scope > .list-paging-area.${PAGING_FLOAT}`).forEach(
				(paging) => {
					const host = paging.closest(".layout-main-section") || list;
					const host_rect = host.getBoundingClientRect();
					paging.style.left = `${Math.round(host_rect.left)}px`;
					paging.style.width = `${Math.round(host_rect.width)}px`;
				}
			);
		});
	}

	/**
	 * Fix .list-paging-area over the list at the natural bottom inset.
	 */
	function layout_floating_paging(scope) {
		const list = scope?.classList?.contains("frappe-list")
			? scope
			: scope?.querySelector?.(".frappe-list");
		if (!list) {
			return;
		}
		list.querySelectorAll(":scope > .list-paging-area").forEach((paging) => {
			if (window.getComputedStyle(paging).display === "none") {
				clear_floating_paging(paging);
				return;
			}
			const host = paging.closest(".layout-main-section") || list;

			const was_floating = paging.classList.contains(PAGING_FLOAT);
			if (was_floating) {
				paging.classList.remove(PAGING_FLOAT);
				paging.style.left = "";
				paging.style.width = "";
				paging.style.bottom = "";
			}

			const spacer = ensure_paging_spacer(list, paging);
			// Collapse spacer while measuring in-flow geometry
			spacer.style.height = "0px";

			const height = paging.offsetHeight;
			let inset = paging_bottom_insets.get(paging);
			if (inset == null || !was_floating) {
				inset = natural_paging_bottom_inset(paging);
				paging_bottom_insets.set(paging, inset);
			}

			const host_rect = host.getBoundingClientRect();
			paging.classList.add(PAGING_FLOAT);
			paging.style.left = `${Math.round(host_rect.left)}px`;
			paging.style.width = `${Math.round(host_rect.width)}px`;
			paging.style.bottom = `${inset}px`;
			spacer.style.height = `${height}px`;
		});
		// Spacer/doc height changes can shift sticky geometry — resync
		api.apply_sticky_top?.();
	}

	/**
	 * Paging starts display:none until list data loads. Layout once it is
	 * visible; if already floating, only refresh left/width.
	 */
	function ensure_or_refresh_floating_paging(scope) {
		const list = scope?.classList?.contains("frappe-list")
			? scope
			: scope?.querySelector?.(".frappe-list");
		if (!list) {
			return;
		}
		const paging = list.querySelector(":scope > .list-paging-area");
		if (!paging) {
			return;
		}
		if (window.getComputedStyle(paging).display === "none") {
			clear_floating_paging(paging);
			return;
		}
		if (!paging.classList.contains(PAGING_FLOAT)) {
			layout_floating_paging(list);
		} else {
			refresh_floating_paging_box(list);
		}
	}

	function layout_all_floating_paging() {
		clear_paging_insets();
		document.querySelectorAll(".frappe-list").forEach((list) => {
			layout_floating_paging(list);
		});
	}

	api.ensure_or_refresh_floating_paging = ensure_or_refresh_floating_paging;
	api.layout_all_floating_paging = layout_all_floating_paging;
	api.reset_floating_inset = clear_paging_insets;

	layout_all_floating_paging();
})();
