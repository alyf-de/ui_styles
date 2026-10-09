import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Use CJS resolver so pre-commit NODE_PATH is honored.
const globals = require("globals");
const js = require("@eslint/js");

export default [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module",
			globals: {
				...globals.browser,
				frappe: "readonly",
				ui_styles: "readonly",
				__: "readonly",
				$: "readonly",
				cint: "readonly",
				cur_list: "readonly",
			},
		},
		rules: {
			"no-useless-escape": "off",
			"no-unused-vars": "off",
			"no-console": "warn",
			"no-extra-boolean-cast": "off",
			"no-control-regex": "off",
		},
	},
];
