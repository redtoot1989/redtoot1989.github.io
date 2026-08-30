/* Compatibility entrypoint for pages that load js/auth.js */
(function (window, document) {
    "use strict";

    function ensureAuthManager() {
        if (window.authManager) return;
        if (window.AuthManager) {
            window.authManager = new window.AuthManager();
            return;
        }
        if (window.auth) {
            window.authManager = {
                currentUser: window.auth.currentUser,
                signOut: () => window.auth.signOut().then(() => { window.location.href = "index.html"; }),
                checkAdminStatus: async () => {
                    const user = window.auth.currentUser;
                    if (!user || !window.db) return { isAdmin: false, role: "guest" };
                    const usersCollection = window.CONFIG?.collections?.USERS || "users";
                    const snap = await window.db.collection(usersCollection).doc(user.uid).get();
                    const data = snap.exists ? snap.data() : {};
                    return { isAdmin: data.isAdmin === true || data.role === "admin", role: data.role || "user" };
                }
            };
            window.auth.onAuthStateChanged((user) => {
                window.authManager.currentUser = user;
                window.dispatchEvent(new CustomEvent("authStateChanged", { detail: { user } }));
            });
            return;
        }
        window.addEventListener("firebaseInitialized", ensureAuthManager, { once: true });
    }

    ensureAuthManager();

    document.addEventListener("DOMContentLoaded", () => {
        const logout = document.getElementById("logout-btn");
        if (logout) logout.addEventListener("click", () => window.authManager?.signOut());
    });
})(window, document);
