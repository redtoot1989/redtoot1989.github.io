/* =============================================================
   Main Application (Merged + Refactored + Documented)
   Includes:
   - ErrorMonitor
   - AppHelpers
   - ComponentsManager
   - MainApp
============================================================= */


/* =============================================================
   APP HELPERS (Utility Toolkit)
============================================================= */
class AppHelpers {
    constructor() {
        this.cache = new Map();
    }
    $(selector) { return document.querySelector(selector) || null; }
    $$(selector) { return Array.from(document.querySelectorAll(selector)); }
    debounce(func, wait = 300, immediate = false) {
        let timeout;
        return function (...args) {
            const context = this;
            const later = () => { timeout = null; if (!immediate) func.apply(context, args); };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }
    escapeHtml(input) {
        if (typeof input !== "string") return "";
        return input
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    formatNumber(num) {
        const n = Number(num) || 0;
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " مليون";
        if (n >= 1_000) return (n / 1_000).toFixed(1) + " ألف";
        return n.toLocaleString("ar-EG");
    }
    formatDate(timestamp, options = {}) {
        if (!timestamp) return "";
        let date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        if (isNaN(date.getTime())) return "";
        return date.toLocaleString("ar-SA", { year: "numeric", month: "long", day: "numeric", ...options });
    }
    storage = {
        set: (key, value) => { try { localStorage.setItem(`app_${key}`, JSON.stringify(value)); return true; } catch { return false; } },
        get: (key) => { try { return JSON.parse(localStorage.getItem(`app_${key}`)) || null; } catch { return null; } },
        remove: (key) => { try { localStorage.removeItem(`app_${key}`); return true; } catch { return false; } }
    };
    optimizeImage(src, width = 300, quality = 80) {
        if (!src || src.includes("placeholder")) return src;
        return `${src}?w=${width}&q=${quality}`;
    }
    getPlatformInfo(platform) {
        const p = {
            instagram: { name: "Instagram", icon: "fab fa-instagram", color: "#E4405F", action: "Follow" },
            snapchat: { name: "Snapchat", icon: "fab fa-snapchat-ghost", color: "#FFFC00", action: "Add" },
            tiktok:    { name: "TikTok", icon: "fab fa-tiktok", color: "#000", action: "Follow" },
            default:   { name: "Platform", icon: "fas fa-link", color: "#6c757d", action: "Visit" }
        };
        return p[platform] || p.default;
    }
    handleError(error, context = "") {
        console.error(`❌ Error in ${context}:`, error);
        const map = {
            "auth/user-not-found": "Email غير مسجّل",
            "auth/wrong-password": "كلمة المرور غير صحيحة",
            "auth/email-already-in-use": "البريد مستخدم مسبقاً"
        };
        return map[error?.code] || error?.message || "حدث خطأ غير متوقع";
    }
    measurePerformance(name, callback) {
        const start = performance.now();
        const result = callback();
        console.log(`⏱️ ${name} executed in ${(performance.now() - start).toFixed(2)}ms`);
        return result;
    }
}
window.AppHelpers = new AppHelpers();


/***************************************************************
 * 4. MAIN APP CORE
 ***************************************************************/
 ***************************************************************/
class MainApp {
    constructor() {
        this.version = "2.0.0";
        this.startTime = performance.now();
        this.bootstrap();
    }

    async bootstrap() {
        try {
            this.initErrorMonitor();
            this.initHelpers();
            this.initComponentsManager();

            await this.loadCoreServices();
            await this.loadInitialData();

            this.buildUI();
            this.bindEvents();
            this.finishStartup();
        } catch (err) {
            window.ErrorMonitor?.handleError("MainApp Fatal", err);
        }
    }

    initErrorMonitor() {
        this.errorMonitor = window.ErrorMonitor;
    }

    initHelpers() {
        this.helpers = window.AppHelpers;
    }

    initComponentsManager() {
        this.components = window.componentsManager;
    }

    async loadCoreServices() {
        await new Promise((r) => setTimeout(r, 200));
    }

    async loadInitialData() {
        await new Promise((r) => setTimeout(r, 150));
    }

    buildUI() {
        const app = document.getElementById("app");
        app.innerHTML = `
            <div class="app-container">
                <h2>🚀 App Loaded Successfully</h2>
                <p>Version: ${this.version}</p>
            </div>
        `;
    }

    bindEvents() {
        window.addEventListener("resize", this.helpers.debounce(() => {
            console.log("📏 Window resized");
        }, 150));

        window.addEventListener("online", () => console.log("📡 Online"));
        window.addEventListener("offline", () => console.warn("📡 Offline"));
    }

    finishStartup() {
        const total = performance.now() - this.startTime;
        console.log(`🎉 App ready in ${total.toFixed(1)}ms`);
    }
}

// Start App
window.mainApp = new MainApp();

