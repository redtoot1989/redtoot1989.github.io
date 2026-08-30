/* Compatibility entrypoint for pages that load js/helpers.js */
(function (window, document) {
    "use strict";

    if (window.AppHelpers) return;

    class AppHelpers {
        $(selector, root = document) { return root.querySelector(selector); }
        $$(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
        debounce(fn, wait = 300) {
            let timer;
            return function (...args) {
                window.clearTimeout(timer);
                timer = window.setTimeout(() => fn.apply(this, args), wait);
            };
        }
        escapeHtml(value) {
            return String(value || "").replace(/[&<>"']/g, (ch) => ({
                "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
            }[ch]));
        }
        formatNumber(value) {
            const number = Number(value) || 0;
            if (number >= 1000000) return `${(number / 1000000).toFixed(1)} مليون`;
            if (number >= 1000) return `${(number / 1000).toFixed(1)} ألف`;
            return number.toLocaleString("ar");
        }
        formatDate(value) {
            const date = value?.toDate ? value.toDate() : new Date(value);
            return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ar-SA");
        }
        showNotification(message, type = "info") {
            const item = document.createElement("div");
            item.className = `toast toast-${type}`;
            item.textContent = message;
            document.body.appendChild(item);
            window.setTimeout(() => item.remove(), 4000);
        }
        handleError(error) {
            return error?.message || "حدث خطأ غير متوقع";
        }
        generateHexId() {
            const bytes = new Uint8Array(4);
            if (window.crypto?.getRandomValues) {
                window.crypto.getRandomValues(bytes);
            } else {
                for (let index = 0; index < bytes.length; index += 1) {
                    bytes[index] = Math.floor(Math.random() * 256);
                }
            }
            return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
        }
        async assignUserHexId(userId, fieldName = "redtootPin", maxRetries = 12) {
            if (!userId || !window.db) throw new Error("Firestore is not ready");
            const usersCollection = window.CONFIG?.collections?.USERS || "users";
            const userRef = window.db.collection(usersCollection).doc(userId);
            const current = await userRef.get();
            const existingPin = current.exists ? current.data()?.[fieldName] : "";
            if (/^[0-9A-F]{8}$/.test(existingPin || "")) return existingPin;

            for (let attempt = 0; attempt < maxRetries; attempt += 1) {
                const candidate = this.generateHexId();
                const duplicate = await window.db.collection(usersCollection).where(fieldName, "==", candidate).limit(1).get();
                if (duplicate.empty) {
                    await userRef.set({
                        [fieldName]: candidate,
                        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    return candidate;
                }
            }
            throw new Error("تعذر إنشاء رقم RedToot فريد");
        }
        async generateUniqueHexId(collectionName, fieldName = "hexId", maxRetries = 12) {
            if (!collectionName || !window.db) throw new Error("Firestore is not ready");
            for (let attempt = 0; attempt < maxRetries; attempt += 1) {
                const candidate = this.generateHexId();
                const duplicate = await window.db.collection(collectionName).where(fieldName, "==", candidate).limit(1).get();
                if (duplicate.empty) return candidate;
            }
            return Date.now().toString(16).padStart(8, "0").toUpperCase().slice(-8);
        }
        normalizeWhatsAppNumber(rawNumber, dialCode = "966") {
            const arabicToEnglish = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
            let phone = String(rawNumber || "").replace(/[٠-٩]/g, (digit) => arabicToEnglish[digit]);
            phone = phone.replace(/[^0-9]/g, "").replace(/^0+/, "");
            return phone && !phone.startsWith(dialCode) ? `${dialCode}${phone}` : phone;
        }
        stripArabicCharacters(value) {
            return String(value || "").replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, "");
        }
    }

    window.AppHelpers = new AppHelpers();
})(window, document);
