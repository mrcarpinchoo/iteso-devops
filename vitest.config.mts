import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: "./wrangler.jsonc" },
		}),
	],
	test: {
		coverage: {
			// workerd does not support native V8 coverage collection, so Istanbul
			// instrumentation is required: https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/
			provider: "istanbul",
			reporter: ["text", "lcov", "html"],
			reportsDirectory: "./coverage",
		},
	},
});
