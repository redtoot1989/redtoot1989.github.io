/* One-time cache-busting refresh helper. Disabled unless explicitly loaded. */
(function (window) {
    "use strict";

    const key = "redtoot_hard_refresh_v1";
    const marker = "_rt_refresh";

    try {
        const url = new URL(window.location.href);
        if (!window.sessionStorage.getItem(key)) {
            window.sessionStorage.setItem(key, "1");
            url.searchParams.set(marker, Date.now().toString());
            window.location.replace(url.toString());
            return;
        }
        if (url.searchParams.has(marker)) {
            url.searchParams.delete(marker);
            window.history.replaceState({}, "", url.toString());
        }
    } catch (error) {
        console.warn("Hard refresh helper failed:", error);
    }
})(window);
