/**
 * Cache tags for the storefront's shared reads.
 *
 * Kept in their own module because the cached readers and the admin save
 * actions that purge them live on opposite sides of the app, and importing
 * one from the other would tangle the two.
 */

/** Products and categories. Purged by every catalogue write. */
export const CATALOG_TAG = "catalog";

/** Nav, tracking snippets and the pop-up — the shell every page renders. */
export const SITE_CHROME_TAG = "site-chrome";
