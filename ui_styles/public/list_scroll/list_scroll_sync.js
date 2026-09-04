/**
 * Dense Desk list: content-sized columns + one header scrollbar that pans
 * all row column tracks via transform (rows do not use their own scrollbar).
 *
 * Gated by List Scroll Settings (frappe.boot.list_scroll.any_dense).
 * Per-list settings from defaults / by_doctype; classes on .frappe-list.
 *
 * Sticky / floating live in sticky_header.js and floating_paging.js
 * (same namespace: ui_styles.list_scroll). Load order: sync → sticky → floating.
 */
frappe.provide("ui_styles.list_scroll");

(() => {
	const boot = frappe.boot?.list_scroll;
	if (!boot?.any_dense) {
		return;
	}

	const api = ui_styles.list_scroll;

	const COL_GAP = 13;
	const ROW_GAP = 8;
	const TRACK = "list-hscroll-track";
	const STICKY = "list-hscroll-sticky";
	const SCROLL = "list-hscroll-scroll";
	const COL_MEASURE = "list-col-measure";
	const HAS_HSCROLL = "list-has-hscroll";
	const CLASS_DENSE = "list-layout-dense";
	const CLASS_STICKY_HEADER = "list-sticky-header";
	const CLASS_FLOATING = "list-floating-paging";
	const CLASS_STICKY_SECTION = "list-scroll-sticky-section";

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

	function empty_settings() {
		return {
			dense_list_layout: 0,
			sticky_list_header: 0,
			floating_list_paging: 0,
			sticky_columns: 0,
		};
	}

	function copy_settings(src) {
		const base = empty_settings();
		if (!src) {
			return base;
		}
		return {
			dense_list_layout: src.dense_list_layout ? 1 : 0,
			sticky_list_header: src.sticky_list_header ? 1 : 0,
			floating_list_paging: src.floating_list_paging ? 1 : 0,
			sticky_columns: Math.max(0, cint(src.sticky_columns)),
		};
	}

	function cint(value) {
		const n = parseInt(value, 10);
		return Number.isFinite(n) ? n : 0;
	}

	function resolve_doctype(scope) {
		const list =
			scope?.classList?.contains("frappe-list")
				? scope
				: scope?.querySelector?.(".frappe-list") || scope?.closest?.(".frappe-list");
		if (typeof cur_list !== "undefined" && cur_list?.doctype && cur_list.$result?.length) {
			const result_el = cur_list.$result.get(0);
			if (result_el && list && list.contains(result_el)) {
				return cur_list.doctype;
			}
		}
		const route = frappe.get_route?.() || [];
		if (route[0] === "List" && route[1]) {
			return route[1];
		}
		return null;
	}

	function resolve_settings(scope) {
		const defaults = copy_settings(boot.defaults);
		const doctype = resolve_doctype(scope);
		if (doctype && boot.by_doctype && boot.by_doctype[doctype]) {
			return copy_settings(boot.by_doctype[doctype]);
		}
		return defaults;
	}

	api.resolve_settings = resolve_settings;

	function get_list_el(scope) {
		if (!scope) {
			return null;
		}
		if (scope.classList?.contains("frappe-list")) {
			return scope;
		}
		return scope.querySelector?.(".frappe-list") || scope.closest?.(".frappe-list");
	}

	function apply_scope_classes(scope, settings) {
		const list = get_list_el(scope);
		if (!list) {
			return null;
		}
		const dense = Boolean(settings.dense_list_layout);
		list.classList.toggle(CLASS_DENSE, dense);
		list.classList.toggle(CLASS_STICKY_HEADER, dense && Boolean(settings.sticky_list_header));
		list.classList.toggle(CLASS_FLOATING, dense && Boolean(settings.floating_list_paging));

		const section = list.closest(".layout-main-section");
		if (section) {
			section.classList.toggle(
				CLASS_STICKY_SECTION,
				dense && Boolean(settings.sticky_list_header)
			);
		}
		return list;
	}

	function clear_dense_layout(list) {
		if (!list) {
			return;
		}
		list.classList.remove(CLASS_DENSE, CLASS_STICKY_HEADER, CLASS_FLOATING, HAS_HSCROLL);
		list.querySelectorAll(".list-row-head").forEach((head) => {
			head.classList.remove(HAS_HSCROLL);
			head.style.removeProperty("top");
		});
		const section = list.closest(".layout-main-section");
		section?.classList.remove(CLASS_STICKY_SECTION);
		all_lefts(list).forEach((left) => {
			unwrap_split(left);
			const track = left.querySelector(`:scope > .${TRACK}`);
			if (track) {
				api.with_dom_mutation(() => {
					while (track.firstChild) {
						left.insertBefore(track.firstChild, track);
					}
					track.remove();
				});
			}
			left.querySelectorAll(".list-row-col").forEach((col) => {
				col.classList.remove(COL_MEASURE);
				col.style.flex = "";
				col.style.width = "";
				col.style.minWidth = "";
				col.style.maxWidth = "";
			});
		});
		level_rights(list).forEach(clear_level_right_size);
		list.querySelectorAll(`.list-paging-area.list-paging-floating`).forEach((paging) => {
			paging.classList.remove("list-paging-floating");
			paging.style.left = "";
			paging.style.width = "";
			paging.style.bottom = "";
		});
		const spacer = list.querySelector(":scope > .list-paging-spacer");
		if (spacer) {
			spacer.style.height = "0px";
		}
	}

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

	function header_scroll_el(scope) {
		const header = header_left(scope);
		if (!header) {
			return null;
		}
		return header.querySelector(`:scope > .${SCROLL}`) || header;
	}

	function unwrap_split(left) {
		const sticky = left.querySelector(`:scope > .${STICKY}`);
		const scroll = left.querySelector(`:scope > .${SCROLL}`);
		if (!sticky && !scroll) {
			return;
		}
		api.with_dom_mutation(() => {
			const track = scroll?.querySelector(`:scope > .${TRACK}`);
			const frag = document.createDocumentFragment();
			if (sticky) {
				while (sticky.firstChild) {
					frag.appendChild(sticky.firstChild);
				}
				sticky.remove();
			}
			if (track) {
				while (track.firstChild) {
					frag.appendChild(track.firstChild);
				}
			}
			if (scroll) {
				scroll.remove();
			}
			const existing_track = left.querySelector(`:scope > .${TRACK}`);
			if (existing_track) {
				while (frag.firstChild) {
					existing_track.appendChild(frag.firstChild);
				}
			} else {
				const new_track = document.createElement("div");
				new_track.className = TRACK;
				new_track.appendChild(frag);
				left.appendChild(new_track);
			}
		});
	}

	function ensure_track(left) {
		let track = left.querySelector(`:scope > .${TRACK}`);
		if (track) {
			return track;
		}
		const scroll = left.querySelector(`:scope > .${SCROLL}`);
		if (scroll) {
			track = scroll.querySelector(`:scope > .${TRACK}`);
			if (track) {
				return track;
			}
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

	function collect_cols(left) {
		const sticky = left.querySelector(`:scope > .${STICKY}`);
		const track =
			left.querySelector(`:scope > .${SCROLL} > .${TRACK}`) ||
			left.querySelector(`:scope > .${TRACK}`);
		const cols = [];
		if (sticky) {
			cols.push(...sticky.querySelectorAll(":scope > .list-row-col"));
		}
		if (track) {
			cols.push(...track.querySelectorAll(":scope > .list-row-col"));
		}
		return cols;
	}

	function get_cols(left) {
		ensure_track(left);
		const cols = collect_cols(left);
		if (cols.length) {
			return cols;
		}
		return Array.from(ensure_track(left).querySelectorAll(":scope > .list-row-col"));
	}

	function desired_sticky_n(cols, sticky_count) {
		if (sticky_count <= 0 || cols.length <= 1) {
			return 0;
		}
		const visible_idxs = [];
		cols.forEach((col, i) => {
			if (!col_is_hidden(col)) {
				visible_idxs.push(i);
			}
		});
		let n = Math.min(sticky_count, visible_idxs.length);
		// Keep at least one column in the scroll zone when possible
		if (visible_idxs.length > 1) {
			n = Math.min(n, visible_idxs.length - 1);
		}
		return Math.max(0, n);
	}

	function current_sticky_n(left) {
		const sticky = left.querySelector(`:scope > .${STICKY}`);
		if (!sticky) {
			return 0;
		}
		return sticky.querySelectorAll(":scope > .list-row-col").length;
	}

	/**
	 * Move the first N visible .list-row-col into a sticky zone; the rest stay
	 * in .list-hscroll-track inside .list-hscroll-scroll.
	 * Skips DOM rebuild when the split already matches (preserves scrollLeft).
	 */
	function ensure_sticky_split(left, sticky_count) {
		const existing_sticky = left.querySelector(`:scope > .${STICKY}`);
		const existing_scroll = left.querySelector(`:scope > .${SCROLL}`);

		if (sticky_count <= 0) {
			if (existing_sticky || existing_scroll) {
				unwrap_split(left);
			}
			return;
		}

		// Already split: only rebuild when sticky column count must change
		if (existing_sticky && existing_scroll) {
			const cols = collect_cols(left);
			const n = desired_sticky_n(cols, sticky_count);
			if (n <= 0) {
				unwrap_split(left);
				return;
			}
			if (current_sticky_n(left) === n) {
				return;
			}
		}

		unwrap_split(left);
		const track = ensure_track(left);
		const all_cols = Array.from(track.querySelectorAll(":scope > .list-row-col"));
		const n = desired_sticky_n(all_cols, sticky_count);
		if (n <= 0) {
			return;
		}

		const visible_idxs = [];
		all_cols.forEach((col, i) => {
			if (!col_is_hidden(col)) {
				visible_idxs.push(i);
			}
		});
		const sticky_idxs = new Set(visible_idxs.slice(0, n));
		api.with_dom_mutation(() => {
			const sticky = document.createElement("div");
			sticky.className = STICKY;
			const scroll = document.createElement("div");
			scroll.className = SCROLL;
			const new_track = document.createElement("div");
			new_track.className = TRACK;

			all_cols.forEach((col, i) => {
				if (sticky_idxs.has(i)) {
					sticky.appendChild(col);
				} else {
					new_track.appendChild(col);
				}
			});

			track.remove();
			scroll.appendChild(new_track);
			left.appendChild(sticky);
			left.appendChild(scroll);
		});
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
		const scroller = header_scroll_el(scope);
		if (!scroller) {
			return;
		}

		api.with_dom_mutation(() => {
			const header_track =
				scroller.querySelector?.(`:scope > .${TRACK}`) ||
				(scroller.classList?.contains(TRACK) ? scroller : null);
			if (header_track) {
				header_track.style.transform = "";
			}

			if (scroller.scrollLeft !== scroll_left) {
				syncing = true;
				scroller.scrollLeft = scroll_left;
				syncing = false;
			}

			const pan = scroller.scrollLeft;
			row_lefts(scope).forEach((left) => {
				const track =
					left.querySelector(`:scope > .${SCROLL} > .${TRACK}`) ||
					left.querySelector(`:scope > .${TRACK}`);
				if (!track) {
					return;
				}
				const scroll_host = track.parentElement?.classList?.contains(SCROLL)
					? track.parentElement
					: left;
				const max_pan = Math.max(0, track.offsetWidth - scroll_host.clientWidth);
				track.style.transform = `translateX(${-Math.min(pan, max_pan)}px)`;
			});
		});
	}

	function cap_sticky_count(scope, sticky_count, lefts) {
		if (sticky_count <= 0) {
			return 0;
		}
		const availables = lefts.map(left_available_width).filter((w) => w > 0);
		if (!availables.length) {
			return sticky_count;
		}
		const available = Math.min(...availables);
		// Reduce N until sticky width leaves a usable scroll viewport (~80px)
		let n = sticky_count;
		while (n > 0) {
			let sticky_w = 0;
			const sample = lefts.find(is_effectively_visible) || lefts[0];
			const cols = get_cols(sample);
			let seen = 0;
			for (const col of cols) {
				if (col_is_hidden(col)) {
					continue;
				}
				if (seen >= n) {
					break;
				}
				sticky_w += Math.max(col.offsetWidth, 64) + COL_GAP;
				seen += 1;
			}
			if (sticky_w <= available - 80 || n <= 1) {
				break;
			}
			n -= 1;
		}
		return n;
	}

	function measure_column_widths(scope) {
		const settings = resolve_settings(scope);
		const list = apply_scope_classes(scope, settings);
		if (!list || !settings.dense_list_layout) {
			clear_dense_layout(list || get_list_el(scope));
			return;
		}

		// In selection mode Frappe hides .list-header-subject (display:none) and
		// shows .checkbox-actions. Still measure from visible row tracks so a
		// list refresh (e.g. clearing a filter while rows stay checked) does not
		// leave new rows without distributed column widths ("collapsed" gaps).
		// Split sticky/scroll on every left (incl. hidden header) so structure
		// stays aligned when selection mode ends.
		const all = all_lefts(list);
		const lefts = all.filter(is_effectively_visible);
		if (!lefts.length) {
			return;
		}

		all.forEach((left) => ensure_track(left));
		equalize_level_rights(list);

		const scroller_before = header_scroll_el(list);
		const saved_scroll = scroller_before ? scroller_before.scrollLeft : 0;

		// Cap before splitting so we build the sticky zone once per measure
		// (rebuilds wipe .list-hscroll-scroll scrollLeft).
		let sticky_count = cap_sticky_count(list, settings.sticky_columns || 0, lefts);
		all.forEach((left) => ensure_sticky_split(left, sticky_count));

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

		function track_size(box_widths, from_idx = 0) {
			let sum = 0;
			for (let i = from_idx; i < col_count; i++) {
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

		// Space left for the scrolling pane after sticky zone
		let sticky_width = 0;
		if (sticky_count > 0) {
			let seen = 0;
			for (let i = 0; i < col_count; i++) {
				if (!participates[i]) {
					continue;
				}
				if (seen >= sticky_count) {
					break;
				}
				sticky_width += content_widths[i] + margins[i];
				seen += 1;
			}
		}
		const scroll_available = Math.max(0, available - sticky_width);

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

		function scroll_track_width(box_widths) {
			if (sticky_count <= 0) {
				return Math.ceil(track_size(box_widths));
			}
			let seen = 0;
			let start = 0;
			for (let i = 0; i < col_count; i++) {
				if (!participates[i]) {
					continue;
				}
				if (seen === sticky_count) {
					start = i;
					break;
				}
				seen += 1;
				start = i + 1;
			}
			return Math.ceil(track_size(box_widths, start));
		}

		let track_width = scroll_track_width(widths);

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
		all_lefts(list).forEach((left) => {
			const track =
				left.querySelector(`:scope > .${SCROLL} > .${TRACK}`) || ensure_track(left);
			track.style.width = `${track_width}px`;
			track.style.minWidth = `${track_width}px`;
			get_cols(left).forEach((col, i) => {
				apply_col_width(col, i);
			});
		});

		let actual_max = 0;
		// Skip display:none header subject (selection mode) - offsetWidth is 0
		all_lefts(list)
			.filter(is_effectively_visible)
			.forEach((left) => {
				const track =
					left.querySelector(`:scope > .${SCROLL} > .${TRACK}`) ||
					left.querySelector(`:scope > .${TRACK}`);
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
			all_lefts(list).forEach((left) => {
				const track =
					left.querySelector(`:scope > .${SCROLL} > .${TRACK}`) ||
					left.querySelector(`:scope > .${TRACK}`);
				if (track) {
					track.style.width = `${track_width}px`;
					track.style.minWidth = `${track_width}px`;
				}
			});
		}
		const scroll_space = sticky_count > 0 ? scroll_available : available;
		if (actual_max > scroll_space + 1) {
			needs_scroll = true;
		}

		list.querySelectorAll(".list-row-head").forEach((head) => {
			head.classList.toggle(HAS_HSCROLL, needs_scroll);
		});
		// Apply floating once paging is visible; afterward only nudge the box
		// (full unfix/reflow on every measure desyncs sticky header).
		api.ensure_or_refresh_floating_paging?.(list);
		api.apply_sticky_top?.();

		const scroller = header_scroll_el(list);
		if (scroller && !needs_scroll) {
			apply_pan(list, 0);
		} else if (scroller) {
			apply_pan(list, saved_scroll);
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
			const is_header_subject = source.classList.contains("list-header-subject");
			const is_header_scroll =
				source.classList.contains(SCROLL) &&
				source.parentElement?.classList.contains("list-header-subject");
			if (!is_header_subject && !is_header_scroll) {
				return;
			}
			const scope = get_scope(source);
			if (!scope || !get_list_el(scope)?.classList.contains(CLASS_DENSE)) {
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
			const list = scope && get_list_el(scope);
			if (!list?.classList.contains(CLASS_DENSE)) {
				return;
			}
			const scroller = header_scroll_el(list);
			if (!scroller || !list.querySelector(`.list-row-head.${HAS_HSCROLL}`)) {
				return;
			}
			event.preventDefault();
			const delta = mostly_horizontal ? event.deltaX : event.deltaY;
			scroller.scrollLeft += delta;
			apply_pan(list, scroller.scrollLeft);
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
				// Pan / measure set inline widths and transforms - do not remasure
				if (
					mutation.attributeName === "style" &&
					(el.classList.contains(TRACK) ||
						el.classList.contains(STICKY) ||
						el.classList.contains(SCROLL) ||
						el.classList.contains("list-row-col") ||
						el.classList.contains("level-right") ||
						el.classList.contains("level-left"))
				) {
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
