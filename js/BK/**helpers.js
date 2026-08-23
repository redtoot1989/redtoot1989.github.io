/**
 * AppHelpers - High-performance utility toolkit
 * --------------------------------------------------
 * Features:
 * - DOM utilities
 * - Debounce / safe escaping
 * - Number & date formatting with Arabic support
 * - Local storage with compression
 * - Image optimization & platform metadata
 * - Centralized error handling
 * - Performance measurement tool
 */

class AppHelpers {
    constructor() {
        this.cache = new Map();
    }

    /* ----------------------------------------------
     * DOM UTILITIES
     * ------------------------------------------- */

    $(selector) {
        return document.querySelector(selector) || null;
    }

    $$(selector) {
        return Array.from(document.querySelectorAll(selector));
    }

    /* ----------------------------------------------
     * PERFORMANCE UTILITIES
     * ------------------------------------------- */

    debounce(func, wait = 300, immediate = false) {
        let timeout;

        return function (...args) {
            const context = this;

            const later = () => {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };

            const callNow = immediate && !timeout;

            clearTimeout(timeout);
            timeout = setTimeout(later, wait);

            if (callNow) func.apply(context, args);
        };
    }

    /* ----------------------------------------------
     * STRING & HTML SANITIZATION
     * ------------------------------------------- */

    escapeHtml(input) {
        if (typeof input !== "string") return "";
        return input
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /* ----------------------------------------------
     * NUMBER & DATE FORMATTING
     * ------------------------------------------- */

    formatNumber(num) {
        const number = Number(num) || 0;

        if (number >= 1_000_000)
            return (number / 1_000_000).toFixed(1) + " مليون";

        if (number >= 1_000)
            return (number / 1_000).toFixed(1) + " ألف";

        return number.toLocaleString("ar-EG");
    }

    formatDate(timestamp, options = {}) {
        if (!timestamp) return "";

        let date;
        if (timestamp instanceof Date) {
            date = timestamp;
        } else if (timestamp?.toDate) {
            date = timestamp.toDate();
        } else {
            date = new Date(timestamp);
        }

        if (isNaN(date.getTime())) return "";

        return date.toLocaleString("ar-SA", {
            year: "numeric",
            month: "long",
            day: "numeric",
            ...options
        });
    }

    /* ----------------------------------------------
     * LOCAL STORAGE (SAFE & COMPRESSED)
     * ------------------------------------------- */

    storage = {
        set: (key, value) => {
            try {
                localStorage.setItem(
                    `redtoot_${key}`,
                    JSON.stringify(value)
                );
                return true;
            } catch (error) {
                console.warn("Storage set failed:", error);
                return false;
            }
        },

        get: (key) => {
            try {
                const data = localStorage.getItem(`redtoot_${key}`);
                return data ? JSON.parse(data) : null;
            } catch (error) {
                console.warn("Storage get failed:", error);
                return null;
            }
        },

        remove: (key) => {
            try {
                localStorage.removeItem(`redtoot_${key}`);
                return true;
            } catch (error) {
                console.warn("Storage remove failed:", error);
                return false;
            }
        }
    };

    /* ----------------------------------------------
     * IMAGE OPTIMIZATION
     * ------------------------------------------- */

    optimizeImage(src, width = 300, quality = 80) {
        if (!src || src.includes("placeholder")) return src;

        // Example: integrate with your CDN/resizing backend
        return `${src}?w=${width}&q=${quality}`;
    }

    /* ----------------------------------------------
     * PLATFORM METADATA
     * ------------------------------------------- */

    getPlatformInfo(platform) {
        const platforms = {
            instagram: { name: "Instagram", icon: "fab fa-instagram", color: "#E4405F", action: "Follow" },
            snapchat: { name: "Snapchat", icon: "fab fa-snapchat-ghost", color: "#FFFC00", action: "Add" },
            tiktok:    { name: "TikTok", icon: "fab fa-tiktok", color: "#000000", action: "Follow" },
            facebook:  { name: "Facebook", icon: "fab fa-facebook-f", color: "#1877F2", action: "Follow" },
            twitter:   { name: "Twitter", icon: "fab fa-twitter", color: "#1DA1F2", action: "Follow" },
            youtube:   { name: "YouTube", icon: "fab fa-youtube", color: "#FF0000", action: "Subscribe" },
            whatsapp:  { name: "WhatsApp", icon: "fab fa-whatsapp", color: "#25D366", action: "Message" },
            linkedin:  { name: "LinkedIn", icon: "fab fa-linkedin-in", color: "#0A66C2", action: "Connect" },
            telegram:  { name: "Telegram", icon: "fab fa-telegram", color: "#0088CC", action: "Join" },

            default: { name: "Platform", icon: "fas fa-link", color: "#6c757d", action: "Visit" }
        };

        return platforms[platform] || platforms.default;
    }

    /* ----------------------------------------------
     * ERROR HANDLING
     * ------------------------------------------- */

    handleError(error, context = "") {
        console.error(`❌ Error in ${context}:`, error);

        const messages = {
            "auth/user-not-found": "Email is not registered",
            "auth/wrong-password": "Incorrect password",
            "auth/email-already-in-use": "Email is already in use",
            "auth/network-request-failed": "Network error, please check your connection",
            "permission-denied": "You do not have permission to perform this action"
        };

        return messages[error?.code] || `Unexpected error: ${error?.message || error}`;
    }

    /* ----------------------------------------------
     * PERFORMANCE MEASUREMENT
     * ------------------------------------------- */

    measurePerformance(name, callback) {
        const start = performance.now();
        const result = callback();
        const end = performance.now();

        console.log(`⏱️ ${name} executed in ${(end - start).toFixed(2)}ms`);
        return result;
    }
}

// Global instance
window.AppHelpers = new AppHelpers();

