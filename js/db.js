/* Small Firestore query helpers for Firebase compat builds. */
(function (window) {
    "use strict";

    async function getApprovedProfiles(options = {}) {
        if (!window.db) return [];
        const limit = Math.min(Number(options.limit) || 24, 100);
        const collections = window.CONFIG?.collections || { PROFILES: "profiles" };
        let query = window.db.collection(collections.PROFILES).where("status", "==", "approved");

        if (options.platform) query = query.where("platform", "==", options.platform);
        if (options.isVip === true) query = query.where("isVip", "==", true);
        if (options.verified === true) query = query.where("verified", "==", true);
        if (options.isFeatured === true) query = query.where("isFeatured", "==", true);
        if (options.profileType) query = query.where("profileType", "==", options.profileType);
        if (options.sort === "popular") query = query.orderBy("views", "desc");
        else if (options.sort === "score") query = query.orderBy("redtootScore", "desc");
        query = query.limit(limit);

        const snap = await query.get();
        return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    window.RedTootDB = { getApprovedProfiles };
})(window);
