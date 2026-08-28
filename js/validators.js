/* Compatibility entrypoint for pages that load js/validators.js */
(function (window) {
    "use strict";

    class FormValidators {
        constructor() {
            this.config = window.CONFIG || {};
            this.limits = this.config.limits || {};
        }

        validateEmail(email) {
            const value = String(email || "").trim();
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            return { isValid, message: isValid ? "" : "البريد الإلكتروني غير صالح" };
        }
        validatePassword(password, confirmPassword = null) {
            const min = this.limits.passwordMin || 6;
            if (!password || password.length < min) {
                return { isValid: false, message: `كلمة المرور يجب أن تكون ${min} أحرف على الأقل` };
            }
            if (confirmPassword !== null && password !== confirmPassword) {
                return { isValid: false, message: "كلمات المرور غير متطابقة" };
            }
            return { isValid: true, message: "" };
        }
        validateUsername(username) {
            const value = String(username || "").trim();
            const min = this.limits.usernameMin || 2;
            const max = this.limits.usernameMax || 50;
            const isValid = value.length >= min && value.length <= max && /^[\p{L}\p{N}_-]+$/u.test(value);
            return { isValid, message: isValid ? "" : "اسم المستخدم غير صالح" };
        }
        validateUrl(url) {
            try {
                const value = String(url || "").trim();
                const parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
                return { isValid: ["http:", "https:"].includes(parsed.protocol), message: "" };
            } catch {
                return { isValid: false, message: "الرابط غير صالح" };
            }
        }
        validateProfile(profile) {
            const errors = [];
            if (!profile.platform) errors.push("اختر المنصة");
            if (!this.validateUsername(profile.username).isValid) errors.push("اسم المستخدم غير صالح");
            if (profile.profileLink && !this.validateUrl(profile.profileLink).isValid) errors.push("رابط الحساب غير صالح");
            return { isValid: errors.length === 0, errors, message: errors.join("، ") };
        }
    }

    window.FormValidators = window.FormValidators || new FormValidators();
})(window);
