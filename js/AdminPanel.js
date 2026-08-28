/* RedToot admin panel controller */
(function (window, document) {
    "use strict";

    class AdminPanel {
        constructor() {
            this.db = window.db;
            this.authManager = window.authManager;
            this.helpers = window.AppHelpers;
            this.config = window.CONFIG || {};
            this.collections = this.config.collections || { PROFILES: "profiles" };
            this.profiles = [];
            this.currentPage = 1;
            this.pageSize = this.config.limits?.adminPageSize || 50;
            this.unsubscribe = null;
            this.init();
        }

        async init() {
            if (!location.pathname.includes("admin")) return;

            if (!this.db || !this.authManager) {
                window.addEventListener("firebaseInitialized", () => {
                    this.db = window.db;
                    this.authManager = window.authManager;
                    this.init();
                }, { once: true });
                return;
            }

            await this.waitForAuth();
            const status = await this.authManager.checkAdminStatus();
            if (!status.isAdmin) {
                location.href = "index.html";
                return;
            }

            this.bindEvents();
            this.listenProfiles();
        }

        waitForAuth() {
            if (this.authManager.currentUser) return Promise.resolve();
            return new Promise((resolve) => {
                const done = (event) => {
                    window.removeEventListener("authStateChanged", done);
                    if (!event.detail.user) location.href = `login.html?returnUrl=${encodeURIComponent(location.pathname)}`;
                    resolve();
                };
                window.addEventListener("authStateChanged", done);
                window.setTimeout(resolve, 2500);
            });
        }

        bindEvents() {
            document.addEventListener("click", async (event) => {
                const action = event.target.closest("[data-admin-action]");
                if (action) {
                    const id = action.dataset.id;
                    if (action.dataset.adminAction === "approve") await this.updateProfile(id, { status: "approved", isBlocked: false });
                    if (action.dataset.adminAction === "block") await this.updateProfile(id, { status: "blocked", isBlocked: true });
                    if (action.dataset.adminAction === "unblock") await this.updateProfile(id, { status: "approved", isBlocked: false });
                    if (action.dataset.adminAction === "delete") await this.deleteProfile(id);
                }

                const page = event.target.closest("[data-admin-page]");
                if (page) {
                    this.currentPage = Number(page.dataset.adminPage) || 1;
                    this.render();
                }
            });
        }

        listenProfiles() {
            this.unsubscribe = this.db.collection(this.collections.PROFILES).orderBy("createdAt", "desc").limit(300).onSnapshot((snapshot) => {
                this.profiles = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                this.currentPage = Math.min(this.currentPage, this.totalPages());
                this.render();
            }, (error) => {
                this.helpers?.showNotification?.("تعذر تحميل بيانات الإدارة", "error");
            });
        }

        render() {
            const total = document.getElementById("totalProfiles");
            const blocked = document.getElementById("blockedProfiles");
            const list = document.getElementById("profilesList");
            const statsBox = document.querySelector(".stats-box");

            if (total) total.textContent = this.profiles.length.toLocaleString("ar");
            if (blocked) blocked.textContent = this.profiles.filter((p) => p.isBlocked || p.status === "blocked").length.toLocaleString("ar");
            if (statsBox && !document.getElementById("approvedProfiles")) {
                statsBox.insertAdjacentHTML("beforeend", `
                    <div class="stat-item">الحسابات المعتمدة: <span id="approvedProfiles">0</span></div>
                    <div class="stat-item">حسابات VIP: <span id="vipProfilesAdmin">0</span></div>
                    <div class="stat-item">البلاغات: <span id="reportedProfilesAdmin">0</span></div>
                `);
            }
            this.setText("approvedProfiles", this.profiles.filter((p) => p.status === "approved").length);
            this.setText("vipProfilesAdmin", this.profiles.filter((p) => p.isVip).length);
            this.setText("reportedProfilesAdmin", this.profiles.reduce((sum, p) => sum + Number(p.reportCount || p.reports || 0), 0));
            if (!list) return;

            const pageProfiles = this.getCurrentPageProfiles();
            list.innerHTML = pageProfiles.map((profile) => this.row(profile)).join("");
            this.renderPagination(list);
        }

        getCurrentPageProfiles() {
            const start = (this.currentPage - 1) * this.pageSize;
            return this.profiles.slice(start, start + this.pageSize);
        }

        totalPages() {
            return Math.max(1, Math.ceil(this.profiles.length / this.pageSize));
        }

        renderPagination(anchor) {
            let container = document.getElementById("admin-pagination");
            if (!container) {
                container = document.createElement("div");
                container.id = "admin-pagination";
                container.className = "pagination";
                anchor.closest("table")?.insertAdjacentElement("afterend", container);
            }

            const total = this.totalPages();
            if (total <= 1) {
                container.innerHTML = "";
                return;
            }

            container.innerHTML = Array.from({ length: total }, (_, index) => {
                const page = index + 1;
                return `<button class="btn btn-sm ${page === this.currentPage ? "active" : ""}" type="button" data-admin-page="${page}">${page}</button>`;
            }).join("");
        }

        row(profile) {
            const safe = (value) => this.helpers?.escapeHtml ? this.helpers.escapeHtml(value) : String(value || "");
            const image = safe(profile.photoURL || profile.imageUrl || "https://via.placeholder.com/48?text=RT");
            const name = safe(profile.name || profile.username || "بدون اسم");
            const description = safe(profile.description || profile.platform || "");
            const status = safe(profile.status || "pending");
            const blocked = profile.isBlocked || profile.status === "blocked";

            return `
                <tr>
                    <td><img src="${image}" alt="${name}" width="48" height="48" loading="lazy"></td>
                    <td>${name}</td>
                    <td>${description}</td>
                    <td>${status}</td>
                    <td>
                        <button class="btn btn-sm" data-admin-action="approve" data-id="${profile.id}">قبول</button>
                        <button class="btn btn-sm" data-admin-action="${blocked ? "unblock" : "block"}" data-id="${profile.id}">
                            ${blocked ? "إلغاء الحجب" : "حجب"}
                        </button>
                        <button class="btn btn-sm btn-danger" data-admin-action="delete" data-id="${profile.id}">حذف</button>
                    </td>
                </tr>
            `;
        }

        async updateProfile(id, data) {
            if (!id) return;
            await this.db.collection(this.collections.PROFILES).doc(id).set({
                ...data,
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        setText(id, value) {
            const el = document.getElementById(id);
            if (el) el.textContent = Number(value || 0).toLocaleString("ar");
        }

        async deleteProfile(id) {
            if (!id || !window.confirm("هل تريد حذف هذا الحساب؟")) return;
            await this.db.collection(this.collections.PROFILES).doc(id).delete();
        }

        destroy() {
            if (this.unsubscribe) this.unsubscribe();
        }
    }

    window.AdminPanel = AdminPanel;
    document.addEventListener("DOMContentLoaded", () => {
        if (location.pathname.includes("admin")) window.adminPanel = new AdminPanel();
    });
})(window, document);
