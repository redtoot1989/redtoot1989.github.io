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
    }

    window.AppHelpers = new AppHelpers();
})(window, document);
