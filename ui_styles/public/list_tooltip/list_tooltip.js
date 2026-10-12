/**
 * List Tooltip: hover an info icon in a list row to preview configured fields,
 * and optionally hover the comment count for the latest Comment / Communication.
 *
 * Gated by List Tooltip Settings (frappe.boot.list_tooltip, only set when enabled
 * and at least one of: a configuration row, or Comment Preview). Patches
 * ListView.prototype once for field tooltips so it keeps working when a
 * DocType's own list JS replaces frappe.listview_settings.
 */
frappe.provide("ui_styles.list_tooltip");

$(() => {
	const boot = frappe.boot?.list_tooltip;
	if (!boot) {
		return;
	}

	const config = boot.by_doctype || {};
	const has_field_tooltips = Object.keys(config).length > 0;
	let $popover;
	let hide_timer = null;
	// Set by setup_comment_preview; no-op when comment preview is off.
	let cancel_pending_preview = () => {};

	function get_popover() {
		if (!$popover || !$popover.length) {
			$popover = $(
				'<div class="list-tooltip-popover" style="display:none;"></div>'
			).appendTo("body");
		}
		return $popover;
	}

	function hide_popover() {
		clearTimeout(hide_timer);
		hide_timer = null;
		cancel_pending_preview();
		$popover?.hide().removeClass("list-tooltip-popover--thread");
	}

	function schedule_hide_popover() {
		clearTimeout(hide_timer);
		// Bridge the gap between comment-count and the popover so the user can move onto it.
		hide_timer = setTimeout(hide_popover, 120);
	}

	frappe.router.on("change", hide_popover);

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

		s = s.replace(/\[cid:[^\]]*\]/gi, "").replace(/\[(image|bild)\s*:[^\]]*\]/gi, "");

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

	function position_popover(anchor) {
		const $pop = get_popover();
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

	if (has_field_tooltips) {
		setup_field_tooltips();
	}
	if (boot.comment_preview) {
		setup_comment_preview();
	}

	function setup_field_tooltips() {
		// ponytail: boot sends the config once per desk load; saving settings needs a hard refresh.
		const proto = frappe.views.ListView.prototype;
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

		function add_icons(listview) {
			const cfg = config[listview.doctype];

			listview.$result.find(".list-row-container").each((idx, row) => {
				const doc = listview.data[idx];
				const $subject = $(row).find(".list-subject");
				if (!doc || $subject.find(".list-tooltip-btn").length) {
					return;
				}

				const $btn = $('<span class="list-tooltip-btn">&#8505;</span>');
				$btn.on("mouseenter", () =>
					show_field_popover(listview.doctype, cfg, doc, $btn[0])
				)
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
			if (!df) {
				return String(value);
			}
			if (df.fieldtype === "Check") {
				return value ? __("Yes") : __("No");
			}
			// frappe.format returns HTML; reduce it to text so only escaped text is rendered.
			return html_to_text(frappe.format(value, df, { inline: true }, doc)) || "—";
		}

		function build_html(doctype, cfg, doc) {
			const rows = cfg.header_fields.map((fieldname) => {
				const df = get_df(doctype, fieldname);
				const label = __(df?.label || fieldname);
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

		function show_field_popover(doctype, cfg, doc, anchor) {
			const $pop = get_popover();
			$pop.removeClass("list-tooltip-popover--thread");
			$pop.html(build_html(doctype, cfg, doc));
			position_popover(anchor);
		}
	}

	function setup_comment_preview() {
		let fetch_seq = 0;
		let hover_timer = null;

		cancel_pending_preview = () => {
			clearTimeout(hover_timer);
			hover_timer = null;
			fetch_seq += 1;
		};

		// Field-tooltip setup already dismisses on render_list; comment-only mode needs the same.
		if (!has_field_tooltips) {
			const proto = frappe.views.ListView.prototype;
			const render_list = proto.render_list;
			proto.render_list = function () {
				render_list.call(this);
				hide_popover();
			};
		}

		const $pop = get_popover();
		$pop.on("mouseenter", () => {
			clearTimeout(hide_timer);
			hide_timer = null;
		});
		$pop.on("mouseleave", () => {
			hide_popover();
		});

		function get_list_context($el) {
			const route = frappe.get_route() || [];
			if (route[0] !== "List" || !route[1]) {
				return null;
			}
			const $row = $el.closest(".list-row");
			if (!$row.length) {
				return null;
			}
			const name = $row.find(".list-row-checkbox").first().attr("data-name");
			if (!name) {
				return null;
			}
			return { doctype: route[1], name };
		}

		function fetch_last_thread(ctx) {
			return frappe
				.call({
					method: "ui_styles.list_tooltip.api.get_last_thread_preview",
					args: {
						reference_doctype: ctx.doctype,
						reference_name: ctx.name,
					},
					quiet: true,
				})
				.then((r) => {
					const message = r.message || {};
					return {
						comment: message.comment || null,
						comm: message.comm || null,
					};
				})
				.catch(() => ({ comment: null, comm: null }));
		}

		function comm_body_text(row) {
			if (!row) {
				return "";
			}
			// text_content is already plain text; html_to_text would strip "<addr>" spans.
			if (row.text_content && String(row.text_content).trim()) {
				return String(row.text_content).trim();
			}
			return html_to_text(row.content || "");
		}

		function comm_has_body(row) {
			return !!comm_body_text(row);
		}

		function comment_has_body(row) {
			return !!(row && html_to_text(row.content || ""));
		}

		function pick_by_date(c, comm) {
			if (!c && !comm) {
				return null;
			}
			if (!c) {
				return { kind: "communication", row: comm };
			}
			if (!comm) {
				return { kind: "comment", row: c };
			}
			const t1 = new Date(c.creation).getTime();
			const t2 = new Date(comm.creation).getTime();
			return t2 >= t1 ? { kind: "communication", row: comm } : { kind: "comment", row: c };
		}

		function resolve_displayable(c, comm) {
			const primary = pick_by_date(c, comm);
			if (!primary) {
				return null;
			}
			if (primary.kind === "communication" && comm_has_body(primary.row)) {
				return primary;
			}
			if (primary.kind === "comment" && comment_has_body(primary.row)) {
				return primary;
			}
			if (primary.kind === "communication" && c && comment_has_body(c)) {
				return { kind: "comment", row: c };
			}
			if (primary.kind === "comment" && comm && comm_has_body(comm)) {
				return { kind: "communication", row: comm };
			}
			return null;
		}

		function format_message_time(creation) {
			if (!creation || !frappe.datetime?.str_to_user) {
				return "";
			}
			return frappe.datetime.str_to_user(creation);
		}

		function meta_type_kicker_icon(es_icon_name, kind_key) {
			const label = escape_html(__(kind_key));
			return (
				`<span class="list-tooltip-meta-kicker" aria-label="${label}" title="${label}">` +
				frappe.utils.icon(es_icon_name, "sm") +
				"</span>"
			);
		}

		function format_comm_sender_receiver_line(row) {
			const sender = (row.sender || "").trim();
			const rec_raw = (row.recipients || "").trim();
			const rec_display = rec_raw
				.split(/[\n,;]+/)
				.map((s) => s.trim())
				.filter(Boolean)
				.join(", ");
			if (!sender && !rec_raw) {
				return "";
			}
			return escape_html(sender || "—") + " → " + escape_html(rec_display || "—");
		}

		function build_body_preview(text, max_lines, max_len) {
			if (!text) {
				return `<div class="list-tooltip-body"><span class="muted">${__(
					"(no text)"
				)}</span></div>`;
			}
			const lines = text.split("\n");
			let s = lines.slice(0, max_lines).join("\n");
			if (max_len && s.length > max_len) {
				s = s.substring(0, max_len) + "…";
			} else if (lines.length > max_lines) {
				s += "\n…";
			}
			return `<div class="list-tooltip-body">${escape_html(s)}</div>`;
		}

		function build_thread_html(winner) {
			if (winner.kind === "communication") {
				const row = winner.row;
				let first_line = meta_type_kicker_icon("es-line-email", "Communication");
				const addrs = format_comm_sender_receiver_line(row);
				if (addrs) {
					first_line += " · " + addrs;
				}
				const ts = format_message_time(row.creation);
				let meta_inner = `<div class="list-tooltip-meta-line">${first_line}</div>`;
				if (row.subject) {
					meta_inner += `<div class="list-tooltip-meta-subject">${escape_html(
						String(row.subject)
					)}</div>`;
				}
				if (ts) {
					meta_inner += `<div class="list-tooltip-meta-time">${escape_html(ts)}</div>`;
				}
				return (
					`<div class="list-tooltip-meta">${meta_inner}</div>` +
					build_body_preview(comm_body_text(row), 18)
				);
			}

			const row = winner.row;
			let first_line = meta_type_kicker_icon("es-line-chat-alt", "Comment");
			if (row.comment_by) {
				first_line += " · " + escape_html(row.comment_by);
			}
			const ts = format_message_time(row.creation);
			let meta_inner = `<div class="list-tooltip-meta-line">${first_line}</div>`;
			if (ts) {
				meta_inner += `<div class="list-tooltip-meta-time">${escape_html(ts)}</div>`;
			}
			return (
				`<div class="list-tooltip-meta">${meta_inner}</div>` +
				build_body_preview(html_to_text(row.content || ""), 10, 480)
			);
		}

		const selector = ".layout-main .frappe-list .comment-count, .frappe-list .comment-count";

		function anchor_still_usable(anchor) {
			if (!anchor?.isConnected) {
				return false;
			}
			const r = anchor.getBoundingClientRect();
			return r.width > 0 && r.height > 0;
		}

		$(document).on("mouseenter", selector, function () {
			const anchor = this;
			const ctx = get_list_context($(anchor));
			if (!ctx) {
				return;
			}
			clearTimeout(hover_timer);
			clearTimeout(hide_timer);
			hide_timer = null;
			const seq = ++fetch_seq;

			hover_timer = setTimeout(() => {
				fetch_last_thread(ctx).then((result) => {
					if (seq !== fetch_seq || !anchor_still_usable(anchor)) {
						return;
					}
					const winner = resolve_displayable(result.comment, result.comm);
					if (!winner) {
						hide_popover();
						return;
					}
					const $pop = get_popover();
					$pop.addClass("list-tooltip-popover--thread");
					$pop.html(build_thread_html(winner));
					position_popover(anchor);
				});
			}, 200);
		});

		$(document).on("mouseleave", selector, () => {
			cancel_pending_preview();
			schedule_hide_popover();
		});
	}
});
