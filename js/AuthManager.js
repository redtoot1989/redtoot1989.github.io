/* RedToot AuthManager - Firebase compat/browser script */
(function (window, document) {
    "use strict";

    class AuthManager {
        constructor(options = {}) {
            this.auth = options.auth || window.auth || null;
            this.db = options.db || window.db || null;
            this.helpers = options.helpers || window.AppHelpers || {};
            this.config = window.CONFIG || {};
            this.collections = this.config.collections || { USERS: "users" };
            this.currentUser = null;
            this.userData = null;
            this.ready = false;

            this.errorMessages = {
                "auth/email-already-in-use": "البريد الإلكتروني مستخدم مسبقا",
                "auth/invalid-email": "البريد الإلكتروني غير صالح",
                "auth/user-not-found": "لا يوجد حساب بهذا البريد",
                "auth/wrong-password": "كلمة المرور غير صحيحة",
                "auth/weak-password": "كلمة المرور ضعيفة",
                "auth/network-request-failed": "تعذر الاتصال بالشبكة"
            };

            this.init();
        }

        init() {
            if (!this.auth && window.firebase?.auth) this.auth = window.firebase.auth();
            if (!this.db && window.firebase?.firestore) this.db = window.firebase.firestore();

            if (!this.auth) {
                window.addEventListener("firebaseInitialized", () => this.init(), { once: true });
                return;
            }
            if (this.ready) return;

            this.ready = true;
            this.auth.onAuthStateChanged((user) => this.handleAuthStateChanged(user));
            this.bindStaticEvents();
        }

        bindStaticEvents() {
            document.addEventListener("click", (event) => {
                const logout = event.target.closest("[data-logout], #logout-btn");
                if (logout) {
                    event.preventDefault();
                    this.signOut();
                }
            });
        }

        async handleAuthStateChanged(user) {
            const previousUser = this.currentUser;
            this.currentUser = user || null;

            if (user) {
                await this.syncUserDocument(user);
            } else {
                this.userData = null;
            }

            this.updateAuthUI();
            window.dispatchEvent(new CustomEvent("authStateChanged", {
                detail: { user: this.currentUser, previousUser }
            }));
        }

        async syncUserDocument(user) {
            if (!this.db || !user) return;

            const ref = this.db.collection(this.collections.USERS).doc(user.uid);
            const baseData = {
                username: user.displayName || this.getNameFromEmail(user.email),
                email: user.email || "",
                photoURL: user.photoURL || "",
                emailVerified: !!user.emailVerified,
                lastLogin: window.firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                const snap = await ref.get();
                if (snap.exists) {
                    await ref.set(baseData, { merge: true });
                    this.userData = { id: snap.id, ...snap.data(), ...baseData };
                } else {
                    const created = {
                        ...baseData,
                        isAdmin: false,
                        isVip: false,
                        isBlocked: false,
                        status: "active",
                        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    };
                    await ref.set(created);
                    this.userData = { id: user.uid, ...created };
                }
            } catch (error) {
                this.helpers?.handleError?.(error);
            }
        }

        updateAuthUI() {
            const authButtons = document.getElementById("auth-buttons");
            const userMenu = document.getElementById("user-menu");
            const userName = document.getElementById("user-name");
            const userAvatar = document.getElementById("user-avatar");
            const adminLink = document.getElementById("admin-link");

            if (this.currentUser) {
                const displayName = this.currentUser.displayName || this.getNameFromEmail(this.currentUser.email);
                if (authButtons) authButtons.hidden = true;
                if (userMenu) userMenu.hidden = false;
                if (userName) userName.textContent = displayName;
                if (userAvatar) userAvatar.textContent = displayName.charAt(0).toUpperCase();
                this.checkAdminStatus().then((result) => {
                    if (adminLink) adminLink.hidden = !result.isAdmin;
                });
            } else {
                if (authButtons) authButtons.hidden = false;
                if (userMenu) userMenu.hidden = true;
                if (adminLink) adminLink.hidden = true;
            }
        }

        async signInWithEmail(email, password, rememberMe = false) {
            await this.ensureReady();
            const persistence = rememberMe
                ? window.firebase.auth.Auth.Persistence.LOCAL
                : window.firebase.auth.Auth.Persistence.SESSION;

            try {
                await this.auth.setPersistence(persistence);
                const credential = await this.auth.signInWithEmailAndPassword(email.trim(), password);
                return { success: true, user: credential.user };
            } catch (error) {
                return { success: false, code: error.code, error: this.getErrorMessage(error) };
            }
        }

        async registerWithEmail(email, password, profile = {}) {
            await this.ensureReady();
            try {
                const credential = await this.auth.createUserWithEmailAndPassword(email.trim(), password);
                const user = credential.user;
                const displayName = profile.username || profile.name || this.getNameFromEmail(email);
                await user.updateProfile({ displayName });
                await this.syncUserDocument(user);
                if (!user.emailVerified) user.sendEmailVerification().catch(() => {});
                return { success: true, user };
            } catch (error) {
                return { success: false, code: error.code, error: this.getErrorMessage(error) };
            }
        }

        async signInWithGoogle() {
            await this.ensureReady();
            try {
                const provider = new window.firebase.auth.GoogleAuthProvider();
                const credential = await this.auth.signInWithPopup(provider);
                return { success: true, user: credential.user };
            } catch (error) {
                return { success: false, code: error.code, error: this.getErrorMessage(error) };
            }
        }

        async signOut() {
            await this.ensureReady();
            await this.auth.signOut();
            window.location.href = "index.html";
        }

        async sendPasswordReset(email) {
            await this.ensureReady();
            await this.auth.sendPasswordResetEmail(email.trim());
            return { success: true };
        }

        async changePassword(newPassword) {
            await this.ensureReady();
            if (!this.auth.currentUser) throw new Error("يجب تسجيل الدخول أولا");
            await this.auth.currentUser.updatePassword(newPassword);
            return { success: true };
        }

        async deleteAccount() {
            await this.ensureReady();
            const user = this.auth.currentUser;
            if (!user) throw new Error("يجب تسجيل الدخول أولا");
            if (this.db) await this.db.collection(this.collections.USERS).doc(user.uid).delete().catch(() => {});
            await user.delete();
            return { success: true };
        }

        async checkAdminStatus() {
            if (!this.currentUser || !this.db) return { isAdmin: false, role: "guest" };
            try {
                const snap = await this.db.collection(this.collections.USERS).doc(this.currentUser.uid).get();
                const data = snap.exists ? snap.data() : {};
                return {
                    isAdmin: data.isAdmin === true || data.role === "admin",
                    role: data.role || (data.isAdmin ? "admin" : "user")
                };
            } catch (error) {
                this.helpers?.handleError?.(error);
                return { isAdmin: false, role: "user" };
            }
        }

        getErrorMessage(error) {
            return this.errorMessages[error?.code] || error?.message || "حدث خطأ غير متوقع";
        }

        getNameFromEmail(email) {
            return email ? email.split("@")[0] : "مستخدم";
        }

        ensureReady() {
            if (this.auth) return Promise.resolve();
            return new Promise((resolve, reject) => {
                const timer = window.setTimeout(() => reject(new Error("Firebase Auth is not ready")), 8000);
                window.addEventListener("firebaseInitialized", () => {
                    window.clearTimeout(timer);
                    this.init();
                    resolve();
                }, { once: true });
            });
        }
    }

    window.AuthManager = AuthManager;
    window.authManager = window.authManager || new AuthManager();
})(window, document);
