/* RedToot shared frontend controller */
(function (window, document) {
    "use strict";

    const config = window.CONFIG || {};
    const helpers = window.AppHelpers || {
        escapeHtml: (value) => String(value || "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch])),
        formatNumber: (value) => String(Number(value) || 0),
        showNotification: (message) => window.alert(message)
    };

    class MainApp {
        constructor() {
            this.version = "3.0.0";
            this.platforms = config.platforms || {};
            this.categories = config.categories || [];
            this.pageSize = config.limits?.pageSize || 24;
            this.statsRetryCount = 0;
            this.observers = new Set();
            document.addEventListener("DOMContentLoaded", () => this.init(), { once: true });
        }

        init() {
            this.addGlobalUi();
            this.highlightActiveNav();
            this.bindGlobalEvents();
            this.renderPlatformCards();
            this.registerServiceWorker();
            this.loadHomeDataWhenReady();
            this.prefillAddProfileFormWhenReady();
        }

        addGlobalUi() {
            if (!document.getElementById("app-status")) {
                const live = document.createElement("div");
                live.id = "app-status";
                live.className = "sr-only";
                live.setAttribute("aria-live", "polite");
                document.body.appendChild(live);
            }
            if (!document.getElementById("back-to-top")) {
                const button = document.createElement("button");
                button.id = "back-to-top";
                button.className = "back-to-top";
                button.type = "button";
                button.setAttribute("aria-label", "العودة إلى الأعلى");
                button.innerHTML = '<i class="fas fa-chevron-up" aria-hidden="true"></i>';
                document.body.appendChild(button);
            }
        }

        bindGlobalEvents() {
            document.addEventListener("click", async (event) => {
                const menu = event.target.closest(".mobile-menu");
                if (menu) this.toggleMobileMenu(menu);

                const top = event.target.closest("#back-to-top");
                if (top) window.scrollTo({ top: 0, behavior: "smooth" });

                const favorite = event.target.closest("[data-action='favorite']");
                if (favorite) {
                    event.preventDefault();
                    await this.toggleFavorite(favorite.dataset.profileId);
                }

                const report = event.target.closest("[data-action='report']");
                if (report) {
                    event.preventDefault();
                    await this.reportProfile(report.dataset.profileId);
                }

                const bump = event.target.closest("[data-action='bump']");
                if (bump) {
                    event.preventDefault();
                    await this.bumpProfile(bump.dataset.profileId);
                }

                const share = event.target.closest("[data-action='share']");
                if (share) {
                    event.preventDefault();
                    await this.shareProfile(share.dataset.profileId);
                }

                const add = event.target.closest("[data-action='add']");
                if (add) {
                    await window.dbManager?.incrementAddCount?.(add.dataset.profileId).catch(() => {});
                }
            });

            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    document.querySelector(".nav-links.active")?.classList.remove("active");
                    document.body.classList.remove("menu-open");
                }
            });

            window.addEventListener("scroll", () => {
                document.getElementById("back-to-top")?.classList.toggle("visible", window.scrollY > 500);
            }, { passive: true });

            window.addEventListener("pagehide", () => this.destroyObservers(), { once: true });
        }

        toggleMobileMenu(menu) {
            const nav = document.querySelector(".nav-links");
            nav?.classList.toggle("active");
            menu.classList.toggle("active");
            document.body.classList.toggle("menu-open", !!nav?.classList.contains("active"));
        }

        highlightActiveNav() {
            const current = location.pathname.split("/").pop() || "index.html";
            document.querySelectorAll(".nav-links a").forEach((link) => {
                link.classList.toggle("active", link.getAttribute("href") === current);
            });
        }

        renderPlatformCards() {
            const grid = document.querySelector(".platforms-grid");
            if (!grid || grid.children.length) return;
            grid.innerHTML = Object.values(this.platforms).map((platform) => `
                <a class="platform-card ${helpers.escapeHtml(platform.id)}" href="all-profiles.html?platform=${encodeURIComponent(platform.id)}" style="--platform-color:${platform.color}">
                    <div class="platform-icon"><i class="${platform.icon}" aria-hidden="true"></i></div>
                    <div class="platform-name">${helpers.escapeHtml(platform.nameAr)}</div>
                    <div class="platform-count"><span id="${platform.id}-count">...</span> حساب</div>
                </a>
            `).join("");
        }

        loadHomeDataWhenReady() {
            if (window.db) {
                this.loadHomeData();
                return;
            }
            window.addEventListener("firebaseInitialized", () => this.loadHomeData(), { once: true });
        }

        async loadHomeData() {
            if (!window.db) return;
            await Promise.allSettled([
                this.loadStats(),
                this.loadPlatformCounts(),
                this.loadProfiles("trending-profiles", { status: "approved", limit: 8 }, { sort: "score" }),
                this.loadProfiles("verified-profiles", { status: "approved", verified: true, limit: 8 }),
                this.loadProfiles("celebrity-profiles", { status: "approved", profileType: "celebrity", limit: 8 }),
                this.loadProfiles("most-viewed-profiles", { status: "approved", limit: 8 }, { sort: "popular" }),
                this.loadProfiles("recent-profiles", { status: "approved", limit: 8 }),
                this.loadProfiles("vip-profiles", { status: "approved", isVip: true, limit: 8 })
            ]);
        }

        async loadStats() {
            try {
                const [profiles, vip] = await Promise.all([
                    window.db.collection(config.collections?.PROFILES || "profiles").where("status", "==", "approved").get(),
                    window.db.collection(config.collections?.PROFILES || "profiles").where("status", "==", "approved").where("isVip", "==", true).get()
                ]);
                this.setText("total-profiles", helpers.formatNumber(profiles.size));
                this.setText("total-users", helpers.formatNumber(this.estimateActiveUsers(profiles.docs)));
                this.setText("vip-count", helpers.formatNumber(vip.size));
                this.statsRetryCount = 0;
            } catch (error) {
                this.setText("total-profiles", "0");
                this.setText("total-users", "0");
                this.setText("vip-count", "0");
                this.setStatus("تعذر تحميل الإحصائيات، سنحاول مرة أخرى لاحقا");
                if (this.statsRetryCount < 2) {
                    this.statsRetryCount += 1;
                    window.setTimeout(() => this.loadStats(), 2500);
                }
            }
        }

        estimateActiveUsers(profileDocs) {
            const owners = new Set();
            profileDocs.forEach((doc) => {
                const data = doc.data();
                if (data.ownerId) owners.add(data.ownerId);
                else if (data.userId) owners.add(data.userId);
                else if (data.username) owners.add(`guest:${data.platform}:${data.username}`);
            });
            return owners.size || profileDocs.length;
        }

        async loadPlatformCounts() {
            if (!window.db || !Object.keys(this.platforms).length) return;
            await Promise.allSettled(Object.keys(this.platforms).map(async (platformId) => {
                const countEl = document.getElementById(`${platformId}-count`);
                if (!countEl) return;
                try {
                    const snapshot = await window.db.collection(config.collections?.PROFILES || "profiles")
                        .where("status", "==", "approved")
                        .where("platform", "==", platformId)
                        .get();
                    countEl.textContent = helpers.formatNumber(snapshot.size);
                } catch {
                    countEl.parentElement.textContent = "تصفح الحسابات";
                }
            }));
        }

        retryHomeLoad(containerId, filters, options = {}) {
            window.setTimeout(() => {
                const container = document.getElementById(containerId);
                if (container?.dataset.retryDone) return;
                if (container) container.dataset.retryDone = "true";
                this.loadProfiles(containerId, filters, options);
            }, 2500);
        }

        homeEmptyState(message) {
            return `
                <div class="empty-state">
                    <p>${helpers.escapeHtml(message)}</p>
                    <a class="btn btn-sm" href="add-profile.html">نشر حسابك الآن</a>
                </div>
            `;
        }

        homeErrorState(message) {
            return `
                <div class="empty-state">
                    <p>${helpers.escapeHtml(message)}</p>
                    <a class="btn btn-sm btn-outline" href="all-profiles.html">تصفح الحسابات</a>
                </div>
            `;
        }

        async loadProfiles(containerId, filters, options = {}) {
            const container = document.getElementById(containerId);
            if (!container || !window.db) return;
            try {
                const result = window.dbManager
                    ? await window.dbManager.getProfiles(filters, { limit: filters.limit || 8, sort: options.sort })
                    : { profiles: [] };
                container.innerHTML = result.profiles.length
                    ? result.profiles.map((profile) => this.createProfileCard(profile)).join("")
                    : this.homeEmptyState("لا توجد حسابات حاليا");
            } catch {
                container.innerHTML = this.homeErrorState("تعذر تحميل الحسابات حاليا");
                this.retryHomeLoad(containerId, filters, options);
            }
        }

        createProfileCard(profile = {}) {
            const platform = this.getPlatform(profile.platform);
            const id = helpers.escapeHtml(profile.id || "");
            const name = helpers.escapeHtml(profile.name || profile.username || "حساب");
            const username = helpers.escapeHtml(profile.username || "");
            const location = helpers.escapeHtml(profile.location || "");
            const category = this.getCategoryName(profile.category);
            const image = helpers.escapeHtml(profile.photoURL || profile.imageUrl || config.app?.defaultImage || "https://via.placeholder.com/320x220?text=RedToot");
            const link = helpers.escapeHtml(this.safeExternalUrl(profile.profileLink || "#"));
            const isVip = this.isVipActive(profile);
            const isRoyal = !!profile.isRoyal || profile.membershipLevel === "royal";
            const verified = !!profile.verified;
            const type = this.getProfileType(profile.profileType);
            const score = helpers.formatNumber(profile.redtootScore || this.calculateDisplayScore(profile));
            const hexId = helpers.escapeHtml(profile.hexId || "");

            return `
                <article class="profile-card" data-id="${id}" data-platform="${helpers.escapeHtml(platform.id)}">
                    <div class="profile-badges">
                        ${isRoyal ? '<span class="royal-badge">ملكي</span>' : ""}
                        ${isVip ? '<span class="vip-badge">VIP</span>' : ""}
                        ${verified ? '<span class="verified-badge"><i class="fas fa-check" aria-hidden="true"></i> موثق</span>' : ""}
                    </div>
                    <div class="profile-avatar">
                        <img src="${image}" alt="${name}" loading="lazy">
                    </div>
                    <div class="profile-card-body">
                        <div class="platform-chip" style="--platform-color:${platform.color}">
                            <i class="${platform.icon}" aria-hidden="true"></i>
                            <span>${helpers.escapeHtml(platform.nameAr)}</span>
                        </div>
                        <h3>${name}</h3>
                        <p class="profile-username">@${username}</p>
                        ${hexId ? `<p class="profile-pin">ID ${hexId}</p>` : ""}
                        <p class="profile-meta">
                            <i class="${type.icon}" aria-hidden="true"></i>
                            ${helpers.escapeHtml(type.nameAr)} - ${category}${location ? " - " + location : ""}
                        </p>
                        <div class="profile-stats">
                            <span><i class="fas fa-heart" aria-hidden="true"></i> ${helpers.formatNumber(profile.favoriteCount || profile.likes || 0)}</span>
                            <span><i class="fas fa-eye" aria-hidden="true"></i> ${helpers.formatNumber(profile.views || 0)}</span>
                            <span><i class="fas fa-fire" aria-hidden="true"></i> ${score}</span>
                        </div>
                        <div class="profile-actions">
                            <a class="btn btn-sm btn-outline" href="profile.html?id=${encodeURIComponent(id)}">تفاصيل</a>
                            <a class="btn btn-sm add-account-btn" href="${link}" target="_blank" rel="noopener noreferrer" data-action="add" data-profile-id="${id}">إضافة</a>
                            <button class="btn btn-sm btn-secondary" type="button" data-action="share" data-profile-id="${id}" aria-label="مشاركة الحساب">
                                <i class="fas fa-share-nodes" aria-hidden="true"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" type="button" data-action="bump" data-profile-id="${id}" aria-label="تحديث الحساب">
                                <i class="fas fa-rotate" aria-hidden="true"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" type="button" data-action="favorite" data-profile-id="${id}" aria-label="إضافة للمفضلة">
                                <i class="fas fa-star" aria-hidden="true"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" type="button" data-action="report" data-profile-id="${id}" aria-label="إبلاغ">
                                <i class="fas fa-flag" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                </article>
            `;
        }

        profileCard(profile) {
            return this.createProfileCard(profile);
        }

        getPlatform(id) {
            return this.platforms[id] || { id: id || "other", nameAr: id || "منصة", icon: "fas fa-link", color: "#6c757d", baseUrl: "" };
        }

        getCategoryName(id) {
            return helpers.escapeHtml(this.categories.find((category) => category.id === id)?.nameAr || "عام");
        }

        getProfileType(id) {
            return config.profileTypes?.[id] || config.profileTypes?.person || { nameAr: "شخص", icon: "fas fa-user" };
        }

        safeExternalUrl(url) {
            try {
                const parsed = new URL(String(url || ""), location.href);
                return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : "#";
            } catch {
                return "#";
            }
        }

        calculateDisplayScore(profile = {}) {
            const weights = config.scoreWeights || {};
            return Math.round(
                Number(profile.views || 0) * (weights.view || 1) +
                Number(profile.clicksCount || profile.addCount || profile.adds || 0) * (weights.click || 3) +
                Number(profile.favoriteCount || profile.likes || 0) * (weights.favorite || 5) +
                Number(profile.shareCount || profile.shares || 0) * (weights.share || 4) +
                (profile.isVip ? (weights.vip || 15) : 0) +
                (profile.isRoyal ? (weights.royal || 30) : 0) +
                (profile.verified ? (weights.verified || 20) : 0) +
                Number(profile.completenessScore || 0) * (weights.completeness || 0.5)
            );
        }

        isVipActive(profile) {
            if (!profile?.isVip) return false;
            const expiry = profile.vipExpiry?.toDate ? profile.vipExpiry.toDate() : profile.vipExpiry ? new Date(profile.vipExpiry) : null;
            return !expiry || expiry > new Date();
        }

        async toggleFavorite(profileId) {
            if (!window.dbManager?.toggleFavorite) return helpers.showNotification("المفضلة غير متاحة حاليا", "warning");
            try {
                await window.dbManager.toggleFavorite(profileId);
                helpers.showNotification("تم تحديث المفضلة", "success");
            } catch (error) {
                helpers.showNotification(error.message || "سجل الدخول لاستخدام المفضلة", "error");
            }
        }

        async reportProfile(profileId) {
            if (!window.dbManager?.createReport) return helpers.showNotification("الإبلاغ غير متاح حاليا", "warning");
            const reason = window.prompt("سبب البلاغ:");
            if (!reason) return;
            try {
                await window.dbManager.createReport(profileId, reason);
                helpers.showNotification("تم إرسال البلاغ", "success");
            } catch (error) {
                helpers.showNotification(error.message || "سجل الدخول لإرسال بلاغ", "error");
            }
        }

        async bumpProfile(profileId) {
            if (!window.dbManager?.bumpProfile) return helpers.showNotification("التحديث غير متاح حاليا", "warning");
            try {
                await window.dbManager.bumpProfile(profileId);
                helpers.showNotification("تم تحديث الحساب ورفعه", "success");
            } catch (error) {
                helpers.showNotification("تعذر تحديث الحساب", "error");
            }
        }

        async shareProfile(profileId) {
            const url = new URL("profile.html", location.href);
            url.searchParams.set("id", profileId);
            try {
                if (navigator.share) {
                    await navigator.share({ title: "RedToot", text: "شاهد هذا الحساب على RedToot", url: url.href });
                } else if (navigator.clipboard) {
                    await navigator.clipboard.writeText(url.href);
                    helpers.showNotification("تم نسخ رابط الحساب", "success");
                }
                await window.dbManager?.incrementShareCount?.(profileId).catch(() => {});
            } catch {
                helpers.showNotification("تعذر مشاركة الحساب", "error");
            }
        }

        prefillAddProfileFormWhenReady() {
            if (!location.pathname.includes("add-profile")) return;
            window.addEventListener("authStateChanged", (event) => {
                const user = event.detail?.user;
                if (!user) return;
                const name = document.getElementById("name");
                const username = document.getElementById("username");
                if (name && !name.value) name.value = user.displayName || "";
                if (username && !username.value && user.email) username.value = user.email.split("@")[0];
            });
        }

        emptyState(message) {
            return `<div class="empty-state">${helpers.escapeHtml(message)}</div>`;
        }

        setText(id, value) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }

        setStatus(message) {
            const live = document.getElementById("app-status");
            if (live) live.textContent = message;
        }

        registerServiceWorker() {
            if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
            navigator.serviceWorker.register("sw.js").catch(() => {
                this.setStatus("تعذر تفعيل وضع العمل دون اتصال");
            });
            navigator.serviceWorker.addEventListener("message", (event) => {
                if (event.data?.type === "SW_UPDATED" && window.confirm("تحديث جديد متاح. هل تريد تحديث الصفحة؟")) {
                    window.location.reload();
                }
            });
        }

        setupInfiniteScroll(containerId, loadMoreFn) {
            const container = document.getElementById(containerId);
            if (!container || typeof loadMoreFn !== "function" || !("IntersectionObserver" in window)) return null;

            document.getElementById(`${containerId}-sentinel`)?.remove();
            const sentinel = document.createElement("div");
            sentinel.id = `${containerId}-sentinel`;
            sentinel.className = "scroll-sentinel";
            sentinel.setAttribute("aria-hidden", "true");
            container.insertAdjacentElement("afterend", sentinel);

            let loading = false;
            const observer = new IntersectionObserver(async (entries) => {
                if (!entries[0].isIntersecting || loading) return;
                loading = true;
                try {
                    const hasMore = await loadMoreFn();
                    if (hasMore === false) observer.disconnect();
                } finally {
                    loading = false;
                }
            }, { rootMargin: "220px" });

            observer.observe(sentinel);
            this.observers.add(observer);
            return observer;
        }

        destroyObservers() {
            this.observers.forEach((observer) => observer.disconnect());
            this.observers.clear();
        }
    }

    window.redTootApp = window.mainApp = new MainApp();
})(window, document);
