/**
 * History: clock menu in the Desk navbar listing recently visited pages.
 *
 * Gated by History Settings (frappe.boot.history, only set when enabled).
 * Reads Route History plus the current session. Does not write routes.
 */
frappe.provide("ui_styles.history");

$(() => {
	const maxEntries = frappe.boot?.history?.max_entries;
	if (!maxEntries) {
		return;
	}

	const api = ui_styles.history;
	const FILTER_KEY = "ui_styles.history.filters";
	const GROUPS = [
		["settings", __("Settings")],
		["workspaces", __("Workspaces")],
		["reports", __("Reports")],
		["lists", __("Lists")],
		["documents", __("Documents", null, "History")],
	];

	api.category = function (route_str) {
		const parts = (route_str || "").split("/").filter(Boolean);
		const kind = parts[0];
		const doctype = parts[1] || "";
		const is_settings = /settings$/i.test(doctype);
		if (kind === "Workspaces" || kind === "dashboard") {
			return "workspaces";
		}
		if (kind === "query-report") {
			return "reports";
		}
		if (kind === "List") {
			return is_settings ? "settings" : "lists";
		}
		if (kind === "Form") {
			const name = parts.slice(2).join("/");
			if (
				is_settings ||
				!name ||
				(frappe.model.is_single && frappe.model.is_single(doctype))
			) {
				return "settings";
			}
			return "documents";
		}
		if (is_settings) {
			return "settings";
		}
		return null;
	};

	api.label = function (route_str) {
		const route = (route_str || "").split("/").filter(Boolean);
		if (!route.length) {
			return route_str || "";
		}
		if (route[0] === "Form" && route[1]) {
			const doctype = __(route[1]);
			const name = route.slice(2).join("/");
			if (name && name !== route[1]) {
				return `${doctype} ${name}`;
			}
			return doctype;
		}
		if (route[0] === "List" && route[1]) {
			return `${__(route[1])} ${__("List")}`;
		}
		if (route[0] === "Tree" && route[1]) {
			return `${__(route[1])} ${__("Tree")}`;
		}
		if (route[0] === "query-report" && route[1]) {
			return `${__(route[1])} ${__("Report")}`;
		}
		if ((route[0] === "Workspaces" || route[0] === "dashboard") && route[1]) {
			return __(route[1]);
		}
		if (frappe.utils.get_route_label) {
			return $("<div>").html(frappe.utils.get_route_label(route_str)).text();
		}
		return route.join(" / ");
	};

	function session_history() {
		const items = [];
		(frappe.route_history_queue || [])
			.slice()
			.reverse()
			.forEach((row) => {
				if (row && row.route) {
					items.push({ route: row.route, creation: row.creation || null });
				}
			});
		(frappe.route_history || [])
			.slice()
			.reverse()
			.forEach((route) => {
				if (!route || !route[0] || !route[1]) {
					return;
				}
				items.push({ route: route.join("/"), creation: null });
			});
		return items;
	}

	function standard_route(route_str) {
		const parts = (route_str || "").split("/").filter(Boolean);
		if (!parts.length) {
			return "";
		}
		const kind = parts[0];
		if (
			kind === "Form" ||
			kind === "List" ||
			kind === "Tree" ||
			kind === "query-report" ||
			kind === "Workspaces" ||
			kind === "dashboard"
		) {
			return parts.join("/");
		}
		const mapped = frappe.router && frappe.router.routes && frappe.router.routes[kind];
		if (!mapped || !mapped.doctype) {
			return parts.join("/");
		}
		const doctype = mapped.doctype;
		if (parts[1] && parts[1] !== "view") {
			return ["Form", doctype].concat(parts.slice(1)).join("/");
		}
		if (frappe.model.is_single && frappe.model.is_single(doctype)) {
			return ["Form", doctype, doctype].join("/");
		}
		return ["List", doctype, "List"].join("/");
	}

	function merge_history(session_items, saved_items) {
		const current = standard_route(frappe.get_route_str && frappe.get_route_str());
		const seen = new Set();
		const merged = [];
		session_items.concat(saved_items || []).forEach((item) => {
			const route = standard_route((item.route || "").replace(/^\/+/, ""));
			if (!route || route === current || seen.has(route)) {
				return;
			}
			seen.add(route);
			merged.push({
				route,
				creation: item.creation || null,
				label: api.label(route),
				href: frappe.router.make_url(route.split("/")),
			});
		});
		return merged;
	}

	function load_filters() {
		let stored = {};
		try {
			stored = JSON.parse(localStorage.getItem(FILTER_KEY) || "{}");
		} catch (e) {
			stored = {};
		}
		const filters = {};
		GROUPS.forEach(([key]) => {
			filters[key] = stored[key] !== false;
		});
		return filters;
	}

	function save_filters(filters) {
		localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
	}

	function hidden_count(filters) {
		return GROUPS.filter(([key]) => !filters[key]).length;
	}

	function visible_items(items) {
		const filters = load_filters();
		return items
			.filter((item) => {
				const group = api.category(item.route);
				if (!group) {
					return true;
				}
				return filters[group] !== false;
			})
			.slice(0, maxEntries);
	}

	function close_menu($root) {
		$root.removeClass("is-open");
		$root.find(".history-button").attr("aria-expanded", "false");
	}

	function filters_html() {
		const filters = load_filters();
		const hidden = hidden_count(filters);
		const options = GROUPS.map(
			([key, label]) => `
				<label class="history-filter-option">
					<input type="checkbox" data-group="${key}" ${filters[key] ? "checked" : ""} />
					<span>${frappe.utils.escape_html(label)}</span>
				</label>`
		).join("");
		return `
			<div class="history-filters">
				<div class="history-filters-bar">
					<button type="button" class="btn-reset history-filters-toggle" aria-expanded="false">
						<span>${__("Filters")}</span>
						<span class="history-filters-chevron" aria-hidden="true">${frappe.utils.icon(
							"es-line-down",
							"xs"
						)}</span>
					</button>
					<button type="button" class="history-filters-chip" ${hidden ? "" : "hidden"} aria-label="${__(
			"Clear"
		)}">
						<span class="history-filters-count">${__("Filters")} ${hidden}</span>
						<span class="history-filters-x" aria-hidden="true">&times;</span>
					</button>
				</div>
				<div class="history-filters-panel">${options}</div>
			</div>
			<div class="history-list"></div>
		`;
	}

	function paint_list($menu, items) {
		const visible = visible_items(items);
		const filters = load_filters();
		const hidden = hidden_count(filters);
		const $chip = $menu.find(".history-filters-chip");
		$chip.prop("hidden", !hidden);
		$chip.find(".history-filters-count").text(`${__("Filters")} ${hidden}`);
		GROUPS.forEach(([key]) => {
			$menu.find(`input[data-group="${key}"]`).prop("checked", filters[key] !== false);
		});
		const $list = $menu.find(".history-list");
		$list.empty();
		if (!visible.length) {
			$list.append(`<div class="history-empty text-muted">${__("No recent pages")}</div>`);
			return;
		}
		visible.forEach((item) => {
			const when = item.creation ? frappe.datetime.comment_when(item.creation, true) : "";
			$list.append(`
				<a class="dropdown-item history-item" href="${frappe.utils.escape_html(
					item.href
				)}" role="menuitem">
					<span class="history-label">${frappe.utils.escape_html(item.label)}</span>
					${when ? `<span class="history-when">${when}</span>` : ""}
				</a>
			`);
		});
	}

	function bind_filters($menu) {
		$menu.find(".history-filters-toggle").on("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			const $filters = $menu.find(".history-filters");
			const open = !$filters.hasClass("is-open");
			$filters.toggleClass("is-open", open);
			$menu.find(".history-filters-toggle").attr("aria-expanded", open ? "true" : "false");
		});
		$menu.find(".history-filters-chip").on("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			const filters = {};
			GROUPS.forEach(([key]) => {
				filters[key] = true;
			});
			save_filters(filters);
			paint_list($menu, $menu.data("items") || []);
		});
		$menu.find(".history-filter-option input").on("change", (event) => {
			event.stopPropagation();
			const filters = load_filters();
			filters[event.target.dataset.group] = event.target.checked;
			save_filters(filters);
			paint_list($menu, $menu.data("items") || []);
		});
	}

	function load_recent($menu) {
		const session_items = session_history();
		frappe.call({
			method: "ui_styles.history.history.get_recent",
			type: "GET",
			callback: (r) => {
				const items = merge_history(session_items, r.message || []);
				$menu.data("items", items);
				paint_list($menu, items);
			},
			error: () => {
				const items = merge_history(session_items, []);
				$menu.data("items", items);
				paint_list($menu, items);
			},
		});
	}

	function render_menu($root) {
		const $menu = $root.find(".history-dropdown");
		$menu.html(filters_html());
		bind_filters($menu);
		$menu.data("items", []);
		paint_list($menu, []);
		load_recent($menu);
	}

	function mount() {
		if ($(".history-menu-root").length) {
			return;
		}
		const $collapse = $(".navbar .navbar-collapse").first();
		if (!$collapse.length) {
			return;
		}
		const $root = $(`
			<div class="history-menu-root">
				<button type="button" class="btn-reset nav-link text-muted history-button" title="${__(
					"History"
				)}" aria-label="${__("History")}" aria-haspopup="true" aria-expanded="false">
					<span class="history-icon" aria-hidden="true"></span>
				</button>
				<div class="history-dropdown" role="menu"></div>
			</div>
		`);
		const $icons = $collapse.find("ul.navbar-nav").first();
		if ($icons.length) {
			$icons.before($root);
		} else {
			$collapse.prepend($root);
		}

		$root.find(".history-button").on("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			const open = !$root.hasClass("is-open");
			$root.toggleClass("is-open", open);
			$root.find(".history-button").attr("aria-expanded", open ? "true" : "false");
			if (open) {
				render_menu($root);
			}
		});
		$(document).on("click.ui_styles_history", (event) => {
			if (!$(event.target).closest(".history-menu-root").length) {
				close_menu($root);
			}
		});
		$(document).on("keydown.ui_styles_history", (event) => {
			if (event.key === "Escape") {
				close_menu($root);
			}
		});
		$(document).on("page-change.ui_styles_history", () => close_menu($root));
	}

	mount();
});
