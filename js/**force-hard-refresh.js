/**
 * Advanced Hard Refresh + Cache Clear
 * -----------------------------------
 * - Forces a one-time hard refresh using a cache-busting token
 * - Prevents infinite refresh loops
 * - Automatically cleans URL after reload
 */

(function () {
    const KEY = "cacheRefreshDone";

    // If this device has NOT refreshed yet
    if (!sessionStorage.getItem(KEY)) {

        // Mark refresh as done (prevents infinite loop)
        sessionStorage.setItem(KEY, "1");

        // Rebuild URL with a cache-busting token
        const url = new URL(window.location.href);
        url.searchParams.set("cacheBust", Date.now().toString(36));

        // Trigger hard refresh (no browser cache)
        window.location.replace(url.toString());

    } else {
        // After refresh → clean up URL & reset flag
        sessionStorage.removeItem(KEY);

        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("cacheBust");

        // Update the URL without reloading
        window.history.replaceState({}, "", cleanUrl.toString());
    }
})();

