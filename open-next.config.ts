import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal OpenNext config. No incremental-cache override: this CRM is almost
// entirely per-user dynamic SSR (inbox, contacts, pipelines behind Supabase
// auth), so there is little to cache. If you later add ISR / cached routes,
// wire up an R2 incremental cache here:
//
//   import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
//   export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache });
//
// (and add an `r2_buckets` binding named NEXT_INC_CACHE_R2_BUCKET to wrangler.jsonc).
export default defineCloudflareConfig({});
