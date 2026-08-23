/* ==========================================================
   🚨 ADVANCED ERROR MONITORING ENGINE (PRO LEVEL)
   Stand-alone JS File Version
=========================================================== */

class ErrorMonitor {
    constructor(options = {}) {
        this.errorShown = false;  
        this.reportEndpoint = options.reportEndpoint || null;
        this.enableUI = options.enableUI !== false;
        this.enableConsole = options.enableConsole !== false;
        this.environment = this.getEnvironmentInfo();

        this.initListeners();
    }

    // ----------------------------------------------------------
    // Activate all global listeners
    // ----------------------------------------------------------
    initListeners() {
        // 1) Runtime JS errors
        window.onerror = (msg, url, line, col, error) => {
            this.handleError("JavaScript Error", {
                message: msg,
                file: url,
                line,
                col,
                stack: error?.stack
            });
        };

        // 2) Promise rejections
        window.onunhandledrejection = (event) => {
            const reason = event?.reason || {};
            this.handleError("Unhandled Promise Error", {
                message: reason?.message || String(reason),
                file: reason?.fileName || "Unknown",
                line: reason?.lineNumber,
                col: reason?.columnNumber,
                stack: reason?.stack
            });
        };

        // 3) Resource loading failures
        window.addEventListener("error", (event) => {
            if (event.target && event.target !== window) {
                this.handleError("Resource Load Error", {
                    message: `Failed to load: ${event.target.src || event.target.href}`,
                    file: event.target.src || event.target.href,
                    stack: "Resource failed to load"
                });
            }
        }, true);

        // 4) Async error listener
        window.addEventListener("error", (e) => {
            if (e.error instanceof Error) {
                this.handleError("Async Error", this.extractError(e.error));
            }
        });

        // 5) Network offline detection
        window.addEventListener("offline", () => {
            this.handleError("Network Offline", {
                message: "User lost internet connection"
            });
        });
    }

    // ----------------------------------------------------------
    // Extract structured error info
    // ----------------------------------------------------------
    extractError(err) {
        return {
            message: err?.message,
            file: err?.fileName,
            line: err?.lineNumber,
            col: err?.columnNumber,
            stack: err?.stack
        };
    }

    // ----------------------------------------------------------
    // Main handler for all error types
    // ----------------------------------------------------------
    handleError(type, data = {}) {
        const errorData = {
            type,
            ...data,
            environment: this.environment,
            timestamp: new Date().toISOString()
        };

        if (this.enableConsole) {
            console.group(`🔴 ${type}`);
            console.error(errorData);
            console.groupEnd();
        }

        if (this.enableUI) this.showOverlay(errorData);

        if (this.reportEndpoint)
            this.sendReport(errorData);
    }

    // ----------------------------------------------------------
    // Send error report to backend
    // ----------------------------------------------------------
    async sendReport(errorData) {
        try {
            await fetch(this.reportEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(errorData)
            });
        } catch (err) {
            console.warn("Failed to send error report:", err);
        }
    }

    // ----------------------------------------------------------
    // Collect system & environment info
    // ----------------------------------------------------------
    getEnvironmentInfo() {
        return {
            url: location.href,
            browser: navigator.userAgent,
            language: navigator.language,
            online: navigator.onLine,
            platform: navigator.platform,
            memory: navigator.deviceMemory || "Unknown",
            cores: navigator.hardwareConcurrency || "Unknown",
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }

    // ----------------------------------------------------------
    // Error overlay UI
    // ----------------------------------------------------------
    showOverlay(error) {
        if (this.errorShown) return;
        this.errorShown = true;

        const box = document.createElement("div");
        box.style.cssText = `
            background: #ffebee;
            color: #b71c1c;
            padding: 1.5rem;
            margin: 1rem;
            border-radius: 10px;
            font-family: Tahoma, sans-serif;
            direction: rtl;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 999999;
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 450px;
        `;

        box.innerHTML = `
            <h2 style="margin-top:0;">⚠️ خطأ في التطبيق</h2>
            <p><strong>النوع:</strong> ${error.type}</p>
            <p><strong>الرسالة:</strong> ${error.message}</p>
            <p><strong>الملف:</strong> ${error.file}</p>
            <p><strong>السطر:</strong> ${error.line || "?"} 
                &nbsp;&nbsp; <strong>العمود:</strong> ${error.col || "?"}</p>

            <h3>Stack Trace:</h3>
            <pre style="
                white-space: pre-wrap;
                background: #ffcdd2;
                padding: 1rem;
                border-radius: 6px;
                max-height: 250px;
                overflow:auto;
            ">${error.stack || "No stack available"}</pre>

            <button onclick="location.reload()" style="
                background: #b71c1c;
                color: white;
                padding: 0.7rem 1.4rem;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
                font-size: 1rem;
                width: 100%;
            ">
                🔄 إعادة تحميل الصفحة
            </button>
        `;

        document.body.appendChild(box);
    }
}

// Export globally
window.ErrorMonitor = ErrorMonitor;

