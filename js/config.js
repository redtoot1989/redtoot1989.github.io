/* RedToot configuration: single source of truth for app constants. */
(function (window) {
    "use strict";

    const env = window._env_ || {};
    const fromEnv = (key, fallback) => env[key] || fallback;

    const CONFIG = Object.freeze({
        app: {
            name: "RedToot",
            projectName: "ReedToot",
            projectId: "reedtoot-3bf23",
            projectNumber: "248298483690",
            webAppNickname: "ReedToot",
            webAppId: "1:248298483690:web:09e27fc6915a3a5e8c0c93",
            supportEmail: "redtoot1989@gmail.com",
            language: "ar",
            direction: "rtl",
            githubPagesUrl: "https://redtoot1989.github.io/",
            defaultImage: "https://via.placeholder.com/320x220?text=RedToot"
        },
        firebase: {
            apiKey: fromEnv("FIREBASE_API_KEY", "AIzaSyBXf3qNF2T31ACZK8280ZGy3vBT1tds7rg"),
            authDomain: fromEnv("FIREBASE_AUTH_DOMAIN", "reedtoot-3bf23.firebaseapp.com"),
            projectId: fromEnv("FIREBASE_PROJECT_ID", "reedtoot-3bf23"),
            storageBucket: fromEnv("FIREBASE_STORAGE_BUCKET", "reedtoot-3bf23.firebasestorage.app"),
            messagingSenderId: fromEnv("FIREBASE_MESSAGING_SENDER_ID", "248298483690"),
            appId: fromEnv("FIREBASE_APP_ID", "1:248298483690:web:09e27fc6915a3a5e8c0c93"),
            measurementId: fromEnv("FIREBASE_MEASUREMENT_ID", "G-W6YF3LLE8X"),
            vapidKey: fromEnv("FIREBASE_VAPID_KEY", "BEqcrcyY2HyvwyDx8nl76ssDpuoe43gE8S9X6V0PM5PJbFNDanmxyKIOMZ7taXDiNkCVIB92qZhqwd7VgdRoWA0")
        },
        collections: {
            USERS: "users",
            PROFILES: "profiles",
            CATEGORIES: "categories",
            PLATFORMS: "platforms",
            VIP_PLANS: "vip_plans",
            VIP_SUBSCRIPTIONS: "vip_subscriptions",
            FAVORITES: "favorites",
            REPORTS: "reports",
            NOTIFICATIONS: "notifications",
            SITE_STATISTICS: "site_statistics",
            SETTINGS: "settings",
            AUDIT_LOGS: "audit_logs"
        },
        roles: { USER: "user", MODERATOR: "moderator", ADMIN: "admin" },
        profileStatus: { PENDING: "pending", APPROVED: "approved", REJECTED: "rejected", BLOCKED: "blocked" },
        reportStatus: { OPEN: "open", REVIEWING: "reviewing", RESOLVED: "resolved", REJECTED: "rejected" },
        vipStatus: { ACTIVE: "active", EXPIRED: "expired", CANCELLED: "cancelled", PENDING: "pending" },
        platforms: {
            instagram: { id: "instagram", nameAr: "انستغرام", nameEn: "Instagram", icon: "fab fa-instagram", color: "#E4405F", baseUrl: "https://instagram.com/" },
            snapchat: { id: "snapchat", nameAr: "سناب شات", nameEn: "Snapchat", icon: "fab fa-snapchat-ghost", color: "#FFFC00", baseUrl: "https://snapchat.com/add/" },
            tiktok: { id: "tiktok", nameAr: "تيك توك", nameEn: "TikTok", icon: "fab fa-tiktok", color: "#111111", baseUrl: "https://tiktok.com/@" },
            youtube: { id: "youtube", nameAr: "يوتيوب", nameEn: "YouTube", icon: "fab fa-youtube", color: "#FF0000", baseUrl: "https://youtube.com/@" },
            x: { id: "x", nameAr: "إكس", nameEn: "X", icon: "fab fa-x-twitter", color: "#111111", baseUrl: "https://x.com/" },
            twitter: { id: "twitter", nameAr: "تويتر", nameEn: "Twitter", icon: "fab fa-twitter", color: "#1DA1F2", baseUrl: "https://x.com/" },
            facebook: { id: "facebook", nameAr: "فيسبوك", nameEn: "Facebook", icon: "fab fa-facebook-f", color: "#1877F2", baseUrl: "https://facebook.com/" },
            whatsapp: { id: "whatsapp", nameAr: "واتساب", nameEn: "WhatsApp", icon: "fab fa-whatsapp", color: "#25D366", baseUrl: "https://wa.me/" },
            telegram: { id: "telegram", nameAr: "تيليجرام", nameEn: "Telegram", icon: "fab fa-telegram", color: "#229ED9", baseUrl: "https://t.me/" },
            jaco: { id: "jaco", nameAr: "جاكو", nameEn: "Jaco", icon: "fas fa-link", color: "#C70039", baseUrl: "" },
            discord: { id: "discord", nameAr: "ديسكورد", nameEn: "Discord", icon: "fab fa-discord", color: "#5865F2", baseUrl: "https://discord.gg/" },
            threads: { id: "threads", nameAr: "ثريدز", nameEn: "Threads", icon: "fab fa-threads", color: "#111111", baseUrl: "https://threads.net/@" },
            linkedin: { id: "linkedin", nameAr: "لينكدإن", nameEn: "LinkedIn", icon: "fab fa-linkedin-in", color: "#0A66C2", baseUrl: "https://linkedin.com/in/" },
            twitch: { id: "twitch", nameAr: "تويتش", nameEn: "Twitch", icon: "fab fa-twitch", color: "#9146FF", baseUrl: "https://twitch.tv/" }
        },
        profileTypes: {
            person: { id: "person", nameAr: "شخص", icon: "fas fa-user" },
            celebrity: { id: "celebrity", nameAr: "مشهور", icon: "fas fa-star" },
            creator: { id: "creator", nameAr: "صانع محتوى", icon: "fas fa-video" },
            business: { id: "business", nameAr: "نشاط تجاري", icon: "fas fa-briefcase" },
            store: { id: "store", nameAr: "متجر", icon: "fas fa-store" },
            community: { id: "community", nameAr: "مجتمع", icon: "fas fa-users" },
            gamer: { id: "gamer", nameAr: "لاعب", icon: "fas fa-gamepad" },
            podcast: { id: "podcast", nameAr: "بودكاست", icon: "fas fa-microphone" },
            channel: { id: "channel", nameAr: "قناة", icon: "fas fa-tv" },
            bot: { id: "bot", nameAr: "بوت", icon: "fas fa-robot" }
        },
        categories: [
            { id: "general", nameAr: "عام" },
            { id: "fun", nameAr: "ضحك وناسه" },
            { id: "groups", nameAr: "قروبات" },
            { id: "girls", nameAr: "للبنات فقط" },
            { id: "boys", nameAr: "لشباب فقط" },
            { id: "celebrities", nameAr: "سنابات المشاهير" },
            { id: "exchange", nameAr: "لتبادل الإضافات" },
            { id: "chat", nameAr: "لتعارف والدردشة" },
            { id: "city_chat", nameAr: "تعارف من مدينتي فقط" },
            { id: "daily", nameAr: "يوميات" },
            { id: "poetry", nameAr: "سناب شعري" },
            { id: "religion", nameAr: "سناب ديني" },
            { id: "support", nameAr: "أحتاج دعمكم" },
            { id: "tech", nameAr: "تقنية" },
            { id: "business", nameAr: "أعمال" },
            { id: "education", nameAr: "تعليم" },
            { id: "entertainment", nameAr: "ترفيه" },
            { id: "sports", nameAr: "رياضة" },
            { id: "gaming", nameAr: "ألعاب" },
            { id: "travel", nameAr: "سفر" },
            { id: "cars", nameAr: "سيارات" },
            { id: "food", nameAr: "طبخ" },
            { id: "fashion", nameAr: "موضة" },
            { id: "health", nameAr: "صحة" },
            { id: "news", nameAr: "أخبار" },
            { id: "other", nameAr: "أخرى" }
        ],
        locations: [
            "السعودية", "الرياض", "جدة", "مكة", "المدينة", "الدمام", "الخبر", "الطائف",
            "أبها", "تبوك", "جازان", "القصيم", "بريدة", "الخرج", "الكويت", "الإمارات",
            "البحرين", "قطر", "عمان", "الأردن", "العراق", "مصر", "المغرب", "الجزائر",
            "تونس", "اليمن", "فلسطين", "لبنان", "ليبيا", "السودان", "سوريا", "موريتانيا"
        ],
        membershipLevels: {
            normal: { id: "normal", nameAr: "عادي", priority: 0 },
            vip: { id: "vip", nameAr: "VIP", priority: 10 },
            royal: { id: "royal", nameAr: "ملكي", priority: 20 }
        },
        scoreWeights: {
            view: 1,
            click: 3,
            favorite: 5,
            share: 4,
            vip: 15,
            royal: 30,
            verified: 20,
            completeness: 0.5
        },
        vipPlans: {
            monthly: { id: "monthly", nameAr: "شهري", price: 49, durationDays: 30 },
            quarterly: { id: "quarterly", nameAr: "3 أشهر", price: 129, durationDays: 90 },
            yearly: { id: "yearly", nameAr: "سنوي", price: 399, durationDays: 365 },
            royalMonthly: { id: "royalMonthly", nameAr: "ملكي شهري", price: 125, durationDays: 30, level: "royal" }
        },
        limits: {
            usernameMin: 2,
            usernameMax: 50,
            passwordMin: 6,
            descriptionMax: 500,
            profileUrlMax: 500,
            pageSize: 24,
            adminPageSize: 50
        }
    });

    window.CONFIG = window.REDTOOT_CONFIG = window.CONFIG || CONFIG;
})(window);
