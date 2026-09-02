(function () {
	const STYLE_ID = "desk-background-tokens";

	function buildCss(tokens) {
		const light = tokens.light;
		const dark = tokens.dark;
		let css = "";

		if (light) {
			css += `
:root[data-theme] {
	--bg-color: ${light.surface};
	--fg-color: ${light.surface};
	--card-bg: ${light.surface};
	--modal-bg: ${light.surface};
	--popover-bg: ${light.surface};
	--navbar-bg: ${light.navbar};
	--sidebar-select-color: ${light.navbar};
	--border-color: ${light.navbar};
	--dark-border-color: ${light.navbar};
	--table-border-color: ${light.navbar};
	--sidebar-border-color: ${light.navbar};
	--btn-group-border-color: ${light.navbar};
}

/* Light only: pastels vs soft desk tints. Dark keeps Frappe --bg-* / --text-on-*. */
:root[data-theme="light"] {
	--bg-blue: var(--blue-200);
	--bg-light-blue: var(--blue-100);
	--bg-green: var(--green-200);
	--bg-yellow: var(--yellow-200);
	--bg-orange: var(--orange-200);
	--bg-red: var(--red-200);
	--bg-gray: var(--gray-200);
	--bg-grey: var(--gray-200);
	--bg-light-gray: var(--gray-200);
	--bg-purple: var(--purple-200);
	--bg-pink: var(--pink-100);
	--bg-cyan: var(--cyan-100);
}
`;
		}

		if (dark && dark.outline) {
			css += `
:root[data-theme="dark"] {
	--border-color: ${dark.outline};
	--dark-border-color: ${dark.outline};
	--table-border-color: ${dark.outline};
	--sidebar-border-color: ${dark.outline};
	--btn-group-border-color: ${dark.outline};
	--rb-rim: 0 0 0 1px ${dark.outline};
	--shadow-base: 0 1px 3px rgba(0, 0, 0, 0.5);
	--shadow-md: var(--rb-rim), 0 2px 4px rgba(0, 0, 0, 0.5);
	--shadow-lg: 0 6px 10px -2px rgba(0, 0, 0, 0.65);
	--shadow-xl: var(--rb-rim), 0 6px 15px -3px rgba(0, 0, 0, 0.6);
	--shadow-2xl: var(--rb-rim), 0 10px 24px -3px rgba(0, 0, 0, 0.65);
	--bg-color: ${dark.surface};
	--fg-color: ${dark.surface};
	--card-bg: ${dark.surface};
	--modal-bg: ${dark.surface};
	--popover-bg: ${dark.surface};
	--navbar-bg: ${dark.navbar};
	--sidebar-select-color: ${dark.navbar};

	/* Restore Frappe dark pill fills (light pastels + --text-on-* are unreadable). */
	--bg-blue: var(--blue-600);
	--bg-light-blue: var(--blue-600);
	--bg-green: var(--green-900);
	--bg-yellow: var(--yellow-700);
	--bg-orange: var(--orange-700);
	--bg-red: var(--red-600);
	--bg-gray: var(--gray-600);
	--bg-grey: var(--gray-600);
	--bg-light-gray: var(--gray-800);
	--bg-purple: var(--purple-700);
	--bg-pink: var(--pink-700);
	--bg-cyan: var(--cyan-800);
}
`;
		}

		// List header: match navbar (default --subtle-fg stays untinted gray).
		// Rim: pill text colour so green/red stay edged vs soft desk tints.
		css += `
:root[data-theme] .list-row-head {
	background-color: var(--navbar-bg);
}

:root[data-theme] .indicator-pill:not(:empty),
:root[data-theme] .indicator-pill-right:not(:empty),
:root[data-theme] .indicator-pill-round:not(:empty) {
	box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 40%, transparent);
}
`;

		return css;
	}

	function applyTokens(tokens) {
		let style = document.getElementById(STYLE_ID);

		if (!tokens) {
			if (style) {
				style.remove();
			}
			return;
		}

		const css = buildCss(tokens);
		if (!css) {
			return;
		}

		if (!style) {
			style = document.createElement("style");
			style.id = STYLE_ID;
			document.head.appendChild(style);
		}
		style.textContent = css;
	}

	function getTokens() {
		const config = frappe.boot && frappe.boot.desk_background;
		if (!config || config.enabled !== 1) {
			return null;
		}
		return config.tokens;
	}

	function run() {
		applyTokens(getTokens());
	}

	function init() {
		run();

		// Desk does not define frappe.ready (website only); use app_ready instead.
		if (window.jQuery) {
			$(document).on("app_ready", run);
		}

		const root = document.documentElement;
		const observer = new MutationObserver(run);
		observer.observe(root, {
			attributes: true,
			attributeFilter: ["data-theme", "data-theme-mode"],
		});
	}

	if (typeof frappe !== "undefined" && frappe.boot) {
		init();
	}
})();
