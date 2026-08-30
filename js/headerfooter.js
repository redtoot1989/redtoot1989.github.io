/* Shared header/footer loader */
document.addEventListener("DOMContentLoaded", async () => {
    const fallbackMarkup = {
        header: `
            <div class="container header-container">
                <div class="logo"><h1>Red<span>Toot</span></h1></div>
                <ul class="nav-links">
                    <li><a href="index.html">الرئيسية</a></li>
                    <li><a href="trending.html">الترند</a></li>
                    <li><a href="all-profiles.html">جميع الحسابات</a></li>
                    <li><a href="lookup.html">بحث برقم</a></li>
                    <li><a href="verified.html">الموثقون</a></li>
                    <li><a href="vip.html">VIP</a></li>
                    <li><a href="add-profile.html">نشر حساب</a></li>
                    <li id="admin-link" hidden><a href="admin.html">لوحة التحكم</a></li>
                </ul>
                <div class="header-actions">
                    <div id="user-menu" hidden>
                        <span id="user-name"></span>
                        <small id="user-pin" class="user-pin"></small>
                        <button id="logout-btn" class="btn btn-secondary">تسجيل الخروج</button>
                    </div>
                    <div id="auth-buttons" class="auth-buttons-container">
                        <a href="register.html" class="btn btn-primary">إنشاء حساب</a>
                        <a href="login.html" class="btn btn-outline">تسجيل الدخول</a>
                    </div>
                    <button class="mobile-menu" type="button" aria-label="القائمة">
                        <i class="fas fa-bars"></i>
                    </button>
                </div>
            </div>
        `,
        footer: `
            <div class="container">
                <div class="footer-grid">
                    <div class="footer-column">
                        <h3>RedToot</h3>
                        <p>دليل عربي لاكتشاف الأشخاص والحسابات والمجتمعات عبر منصات التواصل.</p>
                    </div>
                    <div class="footer-column">
                        <h3>الأقسام</h3>
                        <ul class="footer-links">
                            <li><a href="index.html">الرئيسية</a></li>
                            <li><a href="trending.html">الترند</a></li>
                            <li><a href="verified.html">الحسابات الموثقة</a></li>
                            <li><a href="celebrities.html">المشاهير</a></li>
                            <li><a href="vip.html">VIP</a></li>
                            <li><a href="add-profile.html">نشر حساب</a></li>
                            <li><a href="platforms.html">المنصات</a></li>
                            <li><a href="all-profiles.html">جميع الحسابات</a></li>
                        </ul>
                    </div>
                </div>
                <div class="footer-bottom">
                    <p>جميع الحقوق محفوظة &copy; RedToot</p>
                </div>
            </div>
        `
    };

    async function fetchFirst(urls) {
        let lastError;
        for (const url of urls) {
            try {
                const response = await fetch(url);
                if (response.ok) return response.text();
                lastError = new Error(`HTTP ${response.status}`);
            } catch (error) {
                lastError = error;
            }
        }
        throw lastError || new Error("Unable to load component");
    }

    async function loadContent(id, fileName) {
        const target = document.getElementById(id);
        if (!target) return;

        try {
            target.innerHTML = await fetchFirst([fileName, `./${fileName}`, `/${fileName}`, `../${fileName}`]);
        } catch (error) {
            target.innerHTML = fallbackMarkup[id] || "";
            console.error(`Failed to load ${fileName}:`, error);
        }
    }

    await Promise.all([
        loadContent("header", "header.html"),
        loadContent("footer", "footer.html")
    ]);

    window.authManager?.updateAuthUI?.();
});
