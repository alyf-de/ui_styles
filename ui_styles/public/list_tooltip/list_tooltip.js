/**
 * List Tooltip: hover an info icon in a list row to preview configured fields.
 *
 * Gated by List Tooltip Settings (frappe.boot.list_tooltip, only set when enabled
 * and at least one row is configured). Patches ListView.prototype once, so it
 * keeps working when a DocType's own list JS replaces frappe.listview_settings.
 */
frappe.provide("ui_styles.list_tooltip");

$(() => {
	const config = frappe.boot?.list_tooltip?.by_doctype;
	if (!config) {
		return;
	}

	const proto = frappe.views.ListView.prototype;
	let $popover;

	// ponytail: boot sends the config once per desk load; saving settings needs a hard refresh.
	const set_fields = proto.set_fields;
	proto.set_fields = function () {
		const cfg = config[this.doctype];
		if (cfg) {
			const add_fields = [
				...(this.settings.add_fields || []),
				...cfg.header_fields,
				...cfg.body_fields,
			];
			// Copy so the shared listview_settings object is not mutated per list.
			this.settings = { ...this.settings, add_fields };
		}
		return set_fields.call(this);
	};

	const render_list = proto.render_list;
	proto.render_list = function () {
		render_list.call(this);
		hide_popover();
		if (config[this.doctype]) {
			add_icons(this);
		}
	};

	function get_popover() {
		if (!$popover || !$popover.length) {
			$popover = $('<div class="list-tooltip-popover" style="display:none;"></div>').appendTo(
				"body"
			);
		}
		return $popover;
	}

	function hide_popover() {
		$popover?.hide();
	}

	frappe.router.on("change", hide_popover);

	function add_icons(listview) {
		const cfg = config[listview.doctype];

		listview.$result.find(".list-row-container").each((idx, row) => {
			const doc = listview.data[idx];
			const $subject = $(row).find(".list-subject");
			if (!doc || $subject.find(".list-tooltip-btn").length) {
				return;
			}

			const $btn = $('<span class="list-tooltip-btn">&#8505;</span>');
			$btn.on("mouseenter", () => show_popover(listview.doctype, cfg, doc, $btn[0]))
				.on("mouseleave", hide_popover)
				.on("click", (e) => e.stopPropagation());
			$subject.find(".select-like").after($btn);
		});
	}

	function get_df(doctype, fieldname) {
		return (
			frappe.meta.get_docfield(doctype, fieldname) ||
			frappe.model.std_fields.find((df) => df.fieldname === fieldname)
		);
	}

	function format_value(doctype, doc, fieldname) {
		const df = get_df(doctype, fieldname);
		const value = doc[fieldname];
		if (value == null || value === "") {
			return "—";
		}
		if (df.fieldtype === "Check") {
			return value ? __("Yes") : __("No");
		}
		// frappe.format returns HTML; reduce it to text so only escaped text is rendered.
		return html_to_text(frappe.format(value, df, { inline: true }, doc)) || "—";
	}

	function build_html(doctype, cfg, doc) {
		const rows = cfg.header_fields.map((fieldname) => {
			const label = __(get_df(doctype, fieldname).label);
			const value = format_value(doctype, doc, fieldname);
			return `<tr><td>${escape_html(label)}</td><td><strong>${escape_html(
				value
			)}</strong></td></tr>`;
		});
		const table = rows.length ? `<table>${rows.join("")}</table>` : "";

		return table + build_body(cfg, doc);
	}

	function build_body(cfg, doc) {
		if (!cfg.body_fields.length) {
			return "";
		}

		// First non-empty body field wins (e.g. plain text before HTML content).
		const raw = cfg.body_fields.map((f) => doc[f]).find((v) => v && String(v).trim());
		const text = html_to_text(raw);
		if (!text) {
			return `<div class="list-tooltip-body"><span class="muted">${__(
				"(no content)"
			)}</span></div>`;
		}

		const lines = text.split("\n");
		const suffix = lines.length > cfg.body_max_lines ? "\n…" : "";
		const preview = lines.slice(0, cfg.body_max_lines).join("\n") + suffix;
		return `<div class="list-tooltip-body">${escape_html(preview)}</div>`;
	}

	function show_popover(doctype, cfg, doc, anchor) {
		const $pop = get_popover();
		$pop.html(build_html(doctype, cfg, doc));

		// Measure hidden, then clamp to the viewport.
		const r = anchor.getBoundingClientRect();
		$pop.css({ display: "block", visibility: "hidden", top: 0, left: 0 });
		const width = $pop.outerWidth();
		const height = $pop.outerHeight();
		let left = Math.max(r.left - 8, 8);
		if (left + width + 8 > window.innerWidth) {
			left = Math.max(window.innerWidth - width - 8, 8);
		}
		let top = r.bottom + 6;
		if (top + height + 8 > window.innerHeight) {
			top = Math.max(r.top - height - 6, 8);
		}
		$pop.css({ top, left, visibility: "visible" });
	}

	function escape_html(s) {
		return frappe.utils.escape_html(String(s));
	}

	function html_to_text(html) {
		if (!html) {
			return "";
		}

		// Drop noise that would otherwise bleed through as text: comments (incl.
		// conditional comments), style/script/head blocks, Outlook <o:p>, meta tags.
		let s = String(html)
			.replace(/<!--[\s\S]*?-->/g, "")
			.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
			.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
			.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "")
			.replace(/<\/?o:p[^>]*>/gi, "")
			.replace(/<(meta|title|link)\b[^>]*>/gi, "");

		// Block-level tags become newlines, then strip the remaining tags.
		s = s
			.replace(/<br\s*\/?>/gi, "\n")
			.replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, "\n")
			.replace(/<[^>]+>/g, "");

		// Decode entities via DOM (no tags are left, so this only yields text).
		const tmp = document.createElement("div");
		tmp.innerHTML = s;
		return (tmp.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
	}
});
