/**
 * Dense Desk list: content-sized columns + one header scrollbar that pans
 * all row column tracks via transform (rows do not use their own scrollbar).
 *
 * Gated by List Scroll Settings → Dense List Layout
 * (frappe.boot.list_scroll.dense_list_layout).
 *
 * Sticky / floating live in sticky_header.js and floating_paging.js
 * (same namespace: ui_styles.list_scroll). Load order: sync → sticky → floating.
 */
frappe.provide("ui_styles.list_scroll");

(() => {
	if (!frappe.boot?.list_scroll?.dense_list_layout) {
		return;
	}

	const api = ui_styles.list_scroll;
	document.documentElement.classList.add("list-layout-dense");

	const COL_GAP = 13;
	const ROW_GAP = 8;
	const TRACK = "list-hscroll-track";
	const COL_MEASURE = "list-col-measure";
	const HAS_HSCROLL = "list-has-hscroll";

	let syncing = false;
	let measure_queued = false;
	const measure_scopes = new Set();
	let applying_dom = false;

	api.with_dom_mutation = (fn) => {
		applying_dom = true;
		try {
			return fn();
		} finally {
			applying_dom = false;
		}
	};

	function get_scope(el) {
		return el.closest(".frappe-list") || el.closest(".layout-main-section");
	}

	function header_left(scope) {
		return scope.querySelector(".list-row-head .level-left.list-header-subject");
	}

	function is_effectively_visible(el) {
		return Boolean(el && el.getClientRects().length > 0);
	}

	function row_lefts(scope) {
		return Array.from(scope.querySelectorAll(".list-row > .level-left"));
	}

	function all_lefts(scope) {
		const lefts = row_lefts(scope);
		const header = header_left(scope);
		if (header) {
			lefts.unshift(header);
		}
		return lefts;
	}

	function ensure_track(left) {
		let track = left.querySelector(`:scope > .${TRACK}`);
		if (track) {
			return track;
		}
		return api.with_dom_mutation(() => {
			track = document.createElement("div");
			track.className = TRACK;
			while (left.firstChild) {
				track.appendChild(left.firstChild);
			}
			left.appendChild(track);
			return track;
		});
	}

	function get_cols(left) {
		const track = ensure_track(left);
		return Array.from(track.querySelectorAll(":scope > .list-row-col"));
	}

	function has_hide_class(class_str) {
		return (class_str || "").split(/\s+/).includes("hide");
	}

	function col_is_hidden(col) {
		return Boolean(col && col.classList.contains("hide"));
	}

	function col_margins_x(col) {
		const style = window.getComputedStyle(col);
		return (parseFloat(style.marginLeft) || 0) + (parseFloat(style.marginRight) || 0);
	}

	function col_outer_width(col) {
		return col.offsetWidth + col_margins_x(col);
	}

	function level_rights(scope) {
		return Array.from(
			scope.querySelectorAll(".list-row-head > .level-right, .list-row > .level-right")
		).filter(is_effectively_visible);
	}

	function clear_level_right_size(right) {
		right.style.removeProperty("width");
		right.style.removeProperty("min-width");
		right.style.removeProperty("flex");
		right.style.removeProperty("flex-basis");
	}

	/**
	 * Header .level-right is usually narrower (count + likes) than row
	 * .level-right (timestamp + comments + likes). Equalize so .level-left
	 * widths match and columns can share one pixel pan offset.
	 */
	function equalize_level_rights(scope) {
		const rights = level_rights(scope);
		if (!rights.length) {
			return;
		}
		rights.forEach(clear_level_right_size);
		let max_w = 0;
		rights.forEach((right) => {
			max_w = Math.max(max_w, right.offsetWidth);
		});
		if (max_w <= 0) {
			return;
		}
		max_w = Math.ceil(max_w);
		rights.forEach((right) => {
			right.style.setProperty("flex", `0 0 ${max_w}px`, "important");
			right.style.setProperty("width", `${max_w}px`, "important");
			right.style.setProperty("min-width", `${max_w}px`, "important");
		});
	}

	function left_available_width(left) {
		const row = left.parentElement;
		const right = row?.querySelector(":scope > .level-right");
		const right_w = right ? right.offsetWidth : 0;
		const right_ml = right ? parseFloat(window.getComputedStyle(right).marginLeft) || 0 : 0;
		const from_row = row ? Math.max(0, row.clientWidth - right_w - right_ml) : 0;
		const left_w = left.clientWidth;
		// Cap by space beside .level-right so a too-wide .level-left cannot
		// size columns under the timestamp / likes column.
		if (left_w > 0 && from_row > 0) {
			return Math.min(left_w, from_row);
		}
		if (left_w > 0) {
			return left_w;
		}
		return Math.max(0, from_row - ROW_GAP);
	}

	function apply_pan(scope, scroll_left) {
		const header = header_left(scope);
		if (!header) {
			return;
		}

		const header_track = header.querySelector(`:scope > .${TRACK}`);
		if (header_track) {
			header_track.style.transform = "";
		}
		if (header.scrollLeft !== scroll_left) {
			syncing = true;
			header.scrollLeft = scroll_left;
			syncing = false;
		}

		// Same pixel offset on every row track (level-rights are equalized).
		const pan = header.scrollLeft;
		row_lefts(scope).forEach((left) => {
			const track = left.querySelector(`:scope > .${TRACK}`);
			if (!track) {
				return;
			}
			const max_pan = Math.max(0, track.offsetWidth - left.clientWidth);
			track.style.transform = `translateX(${-Math.min(pan, max_pan)}px)`;
		});
	}

	function measure_column_widths(scope) {
		// In selection mode Frappe hides .list-header-subject (display:none) and
		// shows .checkbox-actions. Still measure from visible row tracks so a
		// list refresh (e.g. clearing a filter while rows stay checked) does not
		// leave new rows without distributed column widths ("collapsed" gaps).
		const lefts = all_lefts(scope).filter(is_effectively_visible);
		if (!lefts.length) {
			return;
		}

		lefts.forEach(ensure_track);
		equalize_level_rights(scope);

		const cols_by_row = lefts.map(get_cols).filter((cols) => cols.length);
		if (!cols_by_row.length) {
			return;
		}

		const col_count = Math.max(...cols_by_row.map((cols) => cols.length));

		cols_by_row.forEach((cols) => {
			cols.forEach((col) => {
				if (col_is_hidden(col)) {
					return;
				}
				col.classList.add(COL_MEASURE);
				col.style.flex = "0 0 auto";
				col.style.width = "auto";
				col.style.minWidth = "0";
				col.style.maxWidth = "none";
			});
		});

		const content_widths = [];
		const participates = [];
		const margins = [];
		let subject_idx = -1;
		for (let i = 0; i < col_count; i++) {
			let max_w = 0;
			let max_margin = 0;
			let visible = false;
			cols_by_row.forEach((cols) => {
				const col = cols[i];
				if (col && !col_is_hidden(col) && is_effectively_visible(col)) {
					visible = true;
					max_w = Math.max(max_w, col.offsetWidth);
					max_margin = Math.max(max_margin, col_margins_x(col));
				}
			});
			const is_subject = cols_by_row.some(
				(cols) => cols[i] && cols[i].classList.contains("list-subject")
			);
			if (!visible) {
				content_widths[i] = 0;
				margins[i] = 0;
				participates[i] = false;
				continue;
			}
			if (is_subject) {
				subject_idx = i;
			}
			// Subject can shrink on very narrow viewports; other cols keep a small floor
			content_widths[i] = Math.ceil(Math.max(max_w, is_subject ? 96 : 64));
			margins[i] = max_margin || COL_GAP;
			participates[i] = true;
		}

		function track_size(box_widths) {
			let sum = 0;
			for (let i = 0; i < col_count; i++) {
				if (!participates[i]) {
					continue;
				}
				sum += box_widths[i] + margins[i];
			}
			return sum;
		}

		const widths = content_widths.slice();
		const availables = lefts.map(left_available_width);
		const positive_availables = availables.filter((w) => w > 0);
		if (!positive_availables.length) {
			return;
		}
		const available = Math.min(...positive_availables);
		const participating = participates.filter(Boolean).length;
		let total_min = track_size(content_widths);
		let extra = available - total_min;
		let needs_scroll = extra < -1;

		// If the subject alone dominates the strip, shrink its floor so later
		// columns stay reachable via the scrollbar on very narrow viewports.
		if (
			needs_scroll &&
			participating > 1 &&
			subject_idx >= 0 &&
			content_widths[subject_idx] > available * 0.7
		) {
			const other_min = total_min - content_widths[subject_idx];
			const subject_cap = Math.max(
				96,
				Math.floor(available - Math.min(other_min, available * 0.45))
			);
			content_widths[subject_idx] = Math.min(content_widths[subject_idx], subject_cap);
			widths[subject_idx] = content_widths[subject_idx];
			total_min = track_size(content_widths);
			extra = available - total_min;
			needs_scroll = extra < -1;
		}

		if (extra > 0 && participating > 0) {
			const share = Math.floor(extra / participating);
			let rest = extra - share * participating;
			for (let i = 0; i < col_count; i++) {
				if (!participates[i]) {
					continue;
				}
				widths[i] += share;
				if (rest > 0) {
					widths[i] += 1;
					rest -= 1;
				}
			}
		}

		let track_width = Math.ceil(track_size(widths));

		function apply_col_width(col, i) {
			const content_w = content_widths[i];
			const w = widths[i];
			col.classList.remove(COL_MEASURE);
			if (w == null || !participates[i] || col_is_hidden(col)) {
				col.style.flex = "";
				col.style.width = "";
				col.style.minWidth = "";
				col.style.maxWidth = "";
				return;
			}
			col.style.flex = `0 0 ${w}px`;
			col.style.width = `${w}px`;
			col.style.minWidth = `${content_w}px`;
			col.style.maxWidth = `${w}px`;
		}

		cols_by_row.forEach((cols) => {
			cols.forEach((col, i) => {
				apply_col_width(col, i);
			});
		});

		// Keep widths on header even when it is later hidden in selection mode
		all_lefts(scope).forEach((left) => {
			const track = ensure_track(left);
			track.style.width = `${track_width}px`;
			track.style.minWidth = `${track_width}px`;
			get_cols(left).forEach((col, i) => {
				apply_col_width(col, i);
			});
		});

		let actual_max = 0;
		// Skip display:none header subject (selection mode) - offsetWidth is 0
		all_lefts(scope)
			.filter(is_effectively_visible)
			.forEach((left) => {
				const track = left.querySelector(`:scope > .${TRACK}`);
				if (!track) {
					return;
				}
				const extent = Array.from(track.querySelectorAll(":scope > .list-row-col"))
					.filter((col) => !col_is_hidden(col))
					.reduce((sum, col) => sum + col_outer_width(col), 0);
				actual_max = Math.max(actual_max, Math.ceil(extent));
			});
		if (actual_max > track_width) {
			track_width = actual_max;
			all_lefts(scope).forEach((left) => {
				const track = left.querySelector(`:scope > .${TRACK}`);
				if (track) {
					track.style.width = `${track_width}px`;
					track.style.minWidth = `${track_width}px`;
				}
			});
		}
		if (actual_max > available + 1) {
			needs_scroll = true;
		}

		scope.querySelectorAll(".list-row-head").forEach((head) => {
			head.classList.toggle(HAS_HSCROLL, needs_scroll);
		});
		// Apply floating once paging is visible; afterward only nudge the box
		// (full unfix/reflow on every measure desyncs sticky header).
		api.ensure_or_refresh_floating_paging?.(scope);
		api.apply_sticky_top?.();

		const header = header_left(scope);
		if (header && !needs_scroll) {
			apply_pan(scope, 0);
		} else if (header) {
			apply_pan(scope, header.scrollLeft || 0);
		}
	}

	function queue_measure(scope) {
		if (!scope) {
			return;
		}
		measure_scopes.add(scope);
		if (measure_queued) {
			return;
		}
		measure_queued = true;
		requestAnimationFrame(() => {
			measure_queued = false;
			const scopes = Array.from(measure_scopes);
			measure_scopes.clear();
			scopes.forEach(measure_column_widths);
		});
	}

	api.queue_measure = queue_measure;

	document.addEventListener(
		"scroll",
		(event) => {
			if (syncing) {
				return;
			}
			const source = event.target;
			if (!(source instanceof Element)) {
				return;
			}
			if (!source.classList.contains("list-header-subject")) {
				return;
			}
			const scope = get_scope(source);
			if (!scope) {
				return;
			}
			apply_pan(scope, source.scrollLeft);
		},
		true
	);

	// Wheel over rows: pan horizontally only when that is clearly the intent.
	// Do not steal mostly-vertical trackpad scrolls (they often include a tiny deltaX).
	document.addEventListener(
		"wheel",
		(event) => {
			const shift_vertical = event.shiftKey && event.deltaY !== 0 && event.deltaX === 0;
			const mostly_horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
			if (!shift_vertical && !mostly_horizontal) {
				return;
			}
			const row_left = event.target.closest?.(".list-row > .level-left");
			if (!row_left) {
				return;
			}
			const scope = get_scope(row_left);
			const header = scope && header_left(scope);
			if (!header || !scope.querySelector(`.list-row-head.${HAS_HSCROLL}`)) {
				return;
			}
			event.preventDefault();
			const delta = mostly_horizontal ? event.deltaX : event.deltaY;
			header.scrollLeft += delta;
			apply_pan(scope, header.scrollLeft);
		},
		{ capture: true, passive: false }
	);

	const observer = new MutationObserver((mutations) => {
		if (applying_dom) {
			return;
		}
		const scopes = new Set();
		let page_head_changed = false;
		for (const mutation of mutations) {
			const el = mutation.target;
			if (!(el instanceof Element)) {
				continue;
			}
			if (mutation.type === "attributes") {
				// jQuery .show()/.hide() on header subject vs checkbox-actions
				if (
					mutation.attributeName === "style" &&
					(el.classList.contains("checkbox-actions") ||
						el.classList.contains("list-header-subject"))
				) {
					const scope = get_scope(el);
					if (scope && (header_left(scope) || row_lefts(scope).length)) {
						scopes.add(scope);
					}
					continue;
				}
				if (
					!el.classList.contains("list-row-col") ||
					has_hide_class(mutation.oldValue) === el.classList.contains("hide")
				) {
					continue;
				}
				const scope = get_scope(el);
				if (scope && (header_left(scope) || row_lefts(scope).length)) {
					scopes.add(scope);
				}
				continue;
			}
			// "N items selected" updates must not relayout columns
			if (el.closest?.(".checkbox-actions")) {
				continue;
			}
			if (
				el.classList?.contains("page-head") ||
				el.querySelector?.(".page-head") ||
				el.classList?.contains("page-container")
			) {
				page_head_changed = true;
			}
			for (const node of mutation.addedNodes || []) {
				if (!(node instanceof Element)) {
					continue;
				}
				if (node.classList?.contains("page-head") || node.querySelector?.(".page-head")) {
					page_head_changed = true;
				}
			}
			const scope = get_scope(el);
			if (scope && (header_left(scope) || row_lefts(scope).length)) {
				scopes.add(scope);
			}
		}
		if (page_head_changed) {
			api.watch_page_head?.();
		}
		scopes.forEach(queue_measure);
	});

	function start_observer() {
		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["class", "style"],
			attributeOldValue: true,
		});
	}

	if (document.body) {
		start_observer();
	} else {
		document.addEventListener("DOMContentLoaded", start_observer);
	}

	$(document).on("page-change", () => {
		api.watch_page_head?.();
		api.reset_floating_inset?.();
		document.querySelectorAll(".frappe-list").forEach(queue_measure);
		api.layout_all_floating_paging?.();
	});

	// Desk page.js: sidebar_wrapper.toggle() then $(document.body).trigger("toggleSidebar")
	$(document.body).on("toggleSidebar", () => {
		requestAnimationFrame(() => {
			document.querySelectorAll(".frappe-list").forEach((list) => {
				api.ensure_or_refresh_floating_paging?.(list);
			});
			api.apply_sticky_top?.();
		});
	});

	let resize_timer = null;
	window.addEventListener("resize", () => {
		clearTimeout(resize_timer);
		resize_timer = setTimeout(() => {
			api.reset_floating_inset?.();
			document.querySelectorAll(".frappe-list").forEach(queue_measure);
			api.follow_page_head_top?.(0);
			api.layout_all_floating_paging?.();
		}, 100);
	});
})();
