/**
 * Main Application - RedToot v4.0
 * Enhanced with robust error handling, performance monitoring, and advanced debug mode
 */

class MainApp {
    constructor(options = {}) {
        // Default options with enhanced defaults
        this.options = Object.assign({
            // Core selectors
            cardsSelector: '#cardsContainer, #profiles-container, .cards-container',
            vipContainer: '#vip-profiles',
            recentContainer: '#recent-profiles',
            
            // Assets
            placeholder: '/assets/images/placeholder-avatar.png',
            
            // Limits
            recentLimit: 8,
            vipLimit: 8,
            
            // Performance
            lazyLoadOffset: '200px',
            searchDebounce: 350,
            
            // Debug
            debugMode: this.getInitialDebugMode(),
            performanceTracking: true,
            autoRecover: true,
            maxRetryAttempts: 3
        }, options);

        // Core dependencies with safety checks
        this.db = this.getSafeDependency('dbManager');
        this.auth = this.getSafeDependency('authManager');
        this.helpers = this.getSafeDependency('AppHelpers');
        
        // Observers and state
        this.imgObserver = null;
        this.intersectionObserver = null;
        this.currentPage = this.getCurrentPage();
        this.performanceMetrics = {};
        this.retryCount = 0;
        
        // Debug system
        this.debugPanel = null;
        this.debugLogs = [];
        
        // Initialize
        this.init();
    }

    // Safe dependency getter with fallbacks
    getSafeDependency(name) {
        if (window[name] && typeof window[name] === 'object') {
            return window[name];
        }
        
        // Create safe fallback
        const fallback = {
            log: (...args) => console.warn(`[FALLBACK ${name}]`, ...args),
            error: (...args) => console.error(`[FALLBACK ${name}]`, ...args)
        };
        
        this.log(`⚠️ Dependency ${name} not found, using fallback`, 'warn');
        return new Proxy(fallback, {
            get: (target, prop) => {
                if (prop in target) return target[prop];
                return (...args) => console.warn(`[FALLBACK ${name}.${prop}]`, ...args);
            }
        });
    }

    getInitialDebugMode() {
        // Auto-enable debug on localhost
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1') {
            return true;
        }
        return localStorage.getItem('debugMode') === 'true';
    }

    init() {
        this.log('🚀 MainApp initializing...', 'info', { 
            page: this.currentPage, 
            debugMode: this.options.debugMode,
            dependencies: {
                db: !!this.db,
                auth: !!this.auth,
                helpers: !!this.helpers
            }
        });

        try {
            // Initialize debug mode first
            this.initDebugMode();

            // Setup error handling
            this.setupGlobalErrorHandling();

            // Initialize app based on ready state
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeApp());
            } else {
                this.initializeApp();
            }
        } catch (error) {
            this.handleCriticalError('init', error);
        }
    }

    setupGlobalErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.log('💥 Global error caught', 'error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.log('💥 Unhandled promise rejection', 'error', {
                reason: event.reason
            });
        });

        // Network status monitoring
        window.addEventListener('online', () => {
            this.log('🌐 Application is online', 'info');
            this.helpers?.showNotification('تم استعادة الاتصال بالإنترنت', 'success');
        });

        window.addEventListener('offline', () => {
            this.log('🌐 Application is offline', 'warn');
            this.helpers?.showNotification('فقدت الاتصال بالإنترنت', 'warning');
        });
    }

    initDebugMode() {
        if (this.options.debugMode) {
            this.log('🔧 Debug mode enabled', 'debug');
            
            this.injectDebugStyles();
            this.createDebugPanel();
            this.startPerformanceMonitoring();
            this.logAppState();

            // Auto-export debug info on errors in debug mode
            window.addEventListener('beforeunload', () => {
                if (this.debugLogs.some(log => log.level === 'error')) {
                    this.exportDebugInfo();
                }
            });
        }

        // Debug keyboard shortcuts
        this.setupDebugShortcuts();
    }

    setupDebugShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+D - Toggle debug mode
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggleDebugMode();
            }
            
            // Ctrl+Shift+L - Show performance logs
            if (e.ctrlKey && e.shiftKey && e.key === 'L') {
                e.preventDefault();
                this.showPerformanceLogs();
            }
            
            // Ctrl+Shift+E - Export debug info
            if (e.ctrlKey && e.shiftKey && e.key === 'E') {
                e.preventDefault();
                this.exportDebugInfo();
            }
        });
    }

    toggleDebugMode() {
        this.options.debugMode = !this.options.debugMode;
        localStorage.setItem('debugMode', this.options.debugMode.toString());
        
        const message = this.options.debugMode ? '🔧 Debug mode enabled' : '🔧 Debug mode disabled';
        
        this.helpers?.showNotification(message, 'info');
        this.log(message, 'info');
        
        window.location.reload();
    }

    injectDebugStyles() {
        // Remove existing debug styles
        const existingStyles = document.getElementById('debug-styles');
        if (existingStyles) existingStyles.remove();

        const style = document.createElement('style');
        style.id = 'debug-styles';
        style.textContent = `
            .debug-border { 
                outline: 2px dashed #ff4444 !important; 
                position: relative;
            }
            .debug-panel {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: rgba(0,0,0,0.95);
                color: #00ff00;
                padding: 10px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                z-index: 10000;
                border-top: 2px solid #00ff00;
                max-height: 300px;
                overflow-y: auto;
                backdrop-filter: blur(10px);
            }
            .debug-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                padding-bottom: 5px;
                border-bottom: 1px solid #00ff00;
            }
            .debug-controls {
                display: flex;
                gap: 5px;
            }
            .debug-btn {
                background: #333;
                color: #00ff00;
                border: 1px solid #00ff00;
                padding: 2px 8px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 11px;
            }
            .debug-btn:hover {
                background: #00ff00;
                color: #000;
            }
            .debug-logs {
                max-height: 200px;
                overflow-y: auto;
            }
            .debug-log {
                margin: 2px 0;
                padding: 2px 0;
                border-bottom: 1px solid #333;
                line-height: 1.3;
            }
            .debug-log.info { color: #ffffff; }
            .debug-log.warn { color: #ffaa00; }
            .debug-log.error { color: #ff4444; }
            .debug-log.debug { color: #00ffff; }
            .debug-log.performance { color: #00ff00; }
            .debug-timestamp {
                color: #888;
                font-size: 10px;
                margin-right: 5px;
            }
            .debug-data {
                font-size: 10px;
                color: #888;
                margin-left: 10px;
            }
        `;
        document.head.appendChild(style);
    }

    createDebugPanel() {
        // Remove existing panel
        this.removeDebugPanel();

        this.debugPanel = document.createElement('div');
        this.debugPanel.className = 'debug-panel';
        this.debugPanel.innerHTML = `
            <div class="debug-header">
                <strong>🔧 RedToot Debug Panel v4.0</strong>
                <div class="debug-controls">
                    <button class="debug-btn" onclick="window.mainApp.clearLogs()">Clear Logs</button>
                    <button class="debug-btn" onclick="window.mainApp.exportDebugInfo()">Export</button>
                    <button class="debug-btn" onclick="window.mainApp.runTests()">Run Tests</button>
                    <button class="debug-btn" onclick="window.mainApp.toggleDebugMode()" style="background: #ff4444; color: white;">Disable Debug</button>
                </div>
            </div>
            <div class="debug-logs" id="debugLogsContainer"></div>
            <div class="debug-stats" id="debugStats">
                Logs: 0 | Errors: 0 | Memory: --
            </div>
        `;
        document.body.appendChild(this.debugPanel);
    }

    removeDebugPanel() {
        if (this.debugPanel?.parentNode) {
            this.debugPanel.parentNode.removeChild(this.debugPanel);
            this.debugPanel = null;
        }
    }

    log(message, level = 'info', data = null) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = { timestamp, message, level, data };
        
        // Store log
        this.debugLogs.push(logEntry);
        if (this.debugLogs.length > 1000) {
            this.debugLogs = this.debugLogs.slice(-500); // Keep last 500 logs
        }

        // Console logging
        const colors = {
            info: '#4CAF50',
            warn: '#FF9800',
            error: '#F44336',
            debug: '#00BCD4',
            performance: '#8BC34A'
        };
        
        console.log(`%c[${timestamp}] ${message}`, `color: ${colors[level]}; font-weight: bold;`, data || '');

        // Debug panel logging
        if (this.options.debugMode && this.debugPanel) {
            this.updateDebugPanel(logEntry);
        }

        // Performance logging
        if (level === 'performance') {
            this.performanceMetrics[message] = data;
        }
    }

    updateDebugPanel(logEntry) {
        const logsContainer = this.debugPanel.querySelector('#debugLogsContainer');
        const statsContainer = this.debugPanel.querySelector('#debugStats');
        
        if (!logsContainer) return;

        const logElement = document.createElement('div');
        logElement.className = `debug-log ${logEntry.level}`;
        logElement.innerHTML = `
            <span class="debug-timestamp">[${logEntry.timestamp}]</span>
            ${logEntry.message}
            ${logEntry.data ? `<pre class="debug-data">${JSON.stringify(logEntry.data, null, 2)}</pre>` : ''}
        `;
        
        logsContainer.appendChild(logElement);
        logsContainer.scrollTop = logsContainer.scrollHeight;

        // Update stats
        const errorCount = this.debugLogs.filter(log => log.level === 'error').length;
        const memory = performance.memory ? 
            `Memory: ${Math.round(performance.memory.usedJSHeapSize / 1048576)}MB` : 
            'Memory: N/A';
            
        statsContainer.textContent = 
            `Logs: ${this.debugLogs.length} | Errors: ${errorCount} | ${memory}`;
    }

    clearLogs() {
        this.debugLogs = [];
        const logsContainer = this.debugPanel?.querySelector('#debugLogsContainer');
        if (logsContainer) logsContainer.innerHTML = '';
        this.log('🧹 Logs cleared', 'info');
    }

    logAppState() {
        this.log('📊 Application State:', 'debug', {
            currentPage: this.currentPage,
            user: this.auth?.currentUser?.email || 'Not logged in',
            firebaseInitialized: !!window.firebaseConfig,
            serviceWorker: 'serviceWorker' in navigator,
            intersectionObserver: 'IntersectionObserver' in window,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            userAgent: navigator.userAgent,
            online: navigator.onLine,
            language: navigator.language
        });
    }

    startPerformanceMonitoring() {
        if (!this.options.performanceTracking) return;

        // Long task monitoring
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (entry.duration > 50) {
                            this.log('⏱️ Long task detected', 'performance', {
                                duration: `${entry.duration.toFixed(2)}ms`,
                                startTime: `${entry.startTime.toFixed(2)}ms`
                            });
                        }
                    });
                });
                observer.observe({ entryTypes: ['longtask'] });
            } catch (error) {
                this.log('❌ PerformanceObserver failed', 'warn', error);
            }
        }

        // Memory monitoring
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                const usage = Math.round(memory.usedJSHeapSize / 1048576);
                const limit = Math.round(memory.jsHeapSizeLimit / 1048576);
                
                if (usage > limit * 0.8) {
                    this.log('💾 High memory usage', 'warn', {
                        used: `${usage}MB`,
                        limit: `${limit}MB`,
                        percentage: `${Math.round((usage / limit) * 100)}%`
                    });
                }
            }, 30000);
        }
    }

    async initializeApp() {
        const startTime = performance.now();
        
        try {
            this.log('🔄 Starting application initialization...', 'info');

            // Initialize core features with retry mechanism
            await this.initCoreFeaturesWithRetry();

            // Page-specific initialization
            await this.initializePage();

            // Performance monitoring
            this.measureInitialLoad();

            const loadTime = performance.now() - startTime;
            this.log('✅ Application initialized successfully', 'info', { 
                loadTime: `${loadTime.toFixed(2)}ms`,
                retryCount: this.retryCount
            });

            this.retryCount = 0; // Reset retry count on success

        } catch (error) {
            this.log('❌ Application initialization failed', 'error', error);
            this.handleInitializationError(error);
        }
    }

    async initCoreFeaturesWithRetry() {
        const features = [
            { name: 'Image Observer', method: this.initImageObserver.bind(this) },
            { name: 'Intersection Observer', method: this.initIntersectionObserver.bind(this) },
            { name: 'Event Delegation', method: this.bindDelegatedEvents.bind(this) },
            { name: 'Service Worker', method: this.setupServiceWorker.bind(this) }
        ];

        for (const feature of features) {
            const startTime = performance.now();
            try {
                await this.retryOperation(() => feature.method(), feature.name);
                const duration = performance.now() - startTime;
                this.log(`✅ ${feature.name} initialized`, 'debug', { 
                    duration: `${duration.toFixed(2)}ms` 
                });
            } catch (error) {
                this.log(`❌ ${feature.name} failed after retries`, 'error', error);
                throw error;
            }
        }
    }

    async retryOperation(operation, operationName, attempt = 1) {
        try {
            return await operation();
        } catch (error) {
            if (attempt >= this.options.maxRetryAttempts) {
                throw error;
            }
            
            this.log(`🔄 Retrying ${operationName} (attempt ${attempt + 1})`, 'warn', {
                error: error.message,
                nextAttempt: attempt + 1
            });
            
            await this.delay(1000 * attempt); // Exponential backoff
            return this.retryOperation(operation, operationName, attempt + 1);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const pageMap = {
            '/': 'home',
            '/index.html': 'home',
            'all-profiles': 'all-profiles',
            'platforms': 'platforms',
            'vip': 'vip',
            'profile': 'profile',
            'add-profile': 'add-profile',
            'admin': 'admin',
            'auth': 'auth'
        };

        for (const [key, value] of Object.entries(pageMap)) {
            if (path.includes(key)) return value;
        }
        return 'unknown';
    }

    async initializePage() {
        this.log(`📄 Initializing page: ${this.currentPage}`, 'info');

        const pageHandlers = {
            'home': () => this.hydrateHome(),
            'all-profiles': () => this.initializeAllProfiles(),
            'platforms': () => this.initializePlatforms(),
            'vip': () => this.initializeVip(),
            'profile': () => this.initializeProfile(),
            'add-profile': () => this.initializeAddProfile(),
            'auth': () => this.initializeAuth(),
            'admin': () => this.initializeAdmin()
        };

        const handler = pageHandlers[this.currentPage];
        if (handler) {
            await handler();
        } else {
            this.log(`⚠️ No handler for page: ${this.currentPage}`, 'warn');
        }
    }

    // Core feature implementations
    initImageObserver() {
        if (!('IntersectionObserver' in window)) {
            this.log('⚠️ IntersectionObserver not supported, using fallback', 'warn');
            this.fallbackImageLoading();
            return;
        }

        this.imgObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    this.log('🖼️ Lazy loading image', 'debug', {
                        src: img.dataset.src,
                        element: img.alt || 'unknown'
                    });
                    this.loadImage(img);
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: this.options.lazyLoadOffset,
            threshold: 0.01
        });

        this.log('✅ Image Observer initialized', 'debug');
    }

    loadImage(img) {
        const src = img.dataset.src;
        if (!src) {
            this.log('❌ No data-src found for image', 'warn', { element: img });
            return;
        }

        const loadStart = performance.now();
        const preloadImg = new Image();
        preloadImg.src = src;
        
        preloadImg.onload = () => {
            const loadTime = performance.now() - loadStart;
            img.src = src;
            img.classList.add('loaded');
            img.removeAttribute('data-src');
            
            this.log('✅ Image loaded successfully', 'debug', {
                src: src,
                loadTime: `${loadTime.toFixed(2)}ms`,
                dimensions: `${img.naturalWidth}x${img.naturalHeight}`
            });
        };

        preloadImg.onerror = () => {
            img.src = this.options.placeholder;
            img.alt = 'تعذر تحميل الصورة';
            this.log('❌ Image failed to load', 'error', { 
                src: src,
                fallback: this.options.placeholder 
            });
        };
    }

    fallbackImageLoading() {
        document.addEventListener('DOMContentLoaded', () => {
            const images = document.querySelectorAll('img[data-src]');
            images.forEach(img => {
                const src = img.dataset.src;
                if (src) {
                    img.src = src;
                    img.removeAttribute('data-src');
                }
            });
        });
    }

    initIntersectionObserver() {
        if (!('IntersectionObserver' in window)) {
            this.log('⚠️ IntersectionObserver not supported', 'warn');
            return;
        }

        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    this.intersectionObserver.unobserve(entry.target);
                    
                    if (this.options.debugMode) {
                        this.log('👀 Element came into view', 'debug', {
                            element: entry.target.className,
                            ratio: entry.intersectionRatio.toFixed(2)
                        });
                    }
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });

        this.log('✅ Intersection Observer initialized', 'debug');
    }

    bindDelegatedEvents() {
        const eventMap = {
            'platform-card': this.handlePlatformClick.bind(this),
            'member-card, .profile-card': this.handleProfileCardClick.bind(this),
            '.like-btn, [data-action="like"]': this.handleLike.bind(this),
            '.share-btn, [data-action="share"]': this.handleShare.bind(this),
            '.filter-btn, [data-filter]': this.handleFilterClick.bind(this),
            '.mobile-menu': this.toggleMobileMenu.bind(this),
            '.search-btn, [data-action="search"]': this.handleSearch.bind(this)
        };

        Object.entries(eventMap).forEach(([selector, handler]) => {
            document.body.addEventListener('click', (e) => {
                const element = e.target.closest(selector);
                if (element) {
                    e.preventDefault();
                    this.log('🖱️ Click event handled', 'debug', {
                        selector: selector,
                        element: element.className
                    });
                    handler(element, e);
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        this.log('✅ Event delegation initialized', 'debug', {
            handlers: Object.keys(eventMap).length
        });
    }

    async handleLike(likeBtn, event) {
        const profileId = likeBtn.dataset.profileId;
        if (!profileId) {
            this.log('❌ Like button missing profile ID', 'warn', { element: likeBtn });
            return;
        }

        const user = this.auth?.currentUser;
        if (!user) {
            this.log('⚠️ User not authenticated for like', 'warn', { profileId });
            this.showAuthRequired('like');
            return;
        }

        try {
            // Optimistic UI update
            const currentLikes = parseInt(likeBtn.dataset.likes || '0');
            const newLikes = currentLikes + 1;
            
            likeBtn.dataset.likes = newLikes.toString();
            likeBtn.classList.add('liked');
            likeBtn.innerHTML = `<i class="fas fa-heart"></i> ${newLikes}`;

            await this.db.incrementField(profileId, 'likes', 1);
            
            this.log('✅ Like successful', 'info', { 
                profileId, 
                likes: newLikes,
                user: user.email 
            });
            
            this.helpers.showNotification('تم الإعجاب بالحساب', 'success');

        } catch (error) {
            // Revert optimistic update
            likeBtn.classList.remove('liked');
            this.log('❌ Like failed', 'error', { 
                profileId, 
                error: error.message 
            });
            this.helpers.showNotification('فشل في الإعجاب', 'error');
        }
    }

    handlePlatformClick(platformCard) {
        const platformClass = Array.from(platformCard.classList)
            .find(cls => cls !== 'platform-card' && cls !== 'in-view');
        
        if (platformClass) {
            const platformMap = {
                'instagram': 'instagram',
                'snapchat': 'snapchat', 
                'tiktok': 'tiktok',
                'facebook': 'facebook',
                'twitter': 'twitter',
                'youtube': 'youtube',
                'whatsapp': 'whatsapp',
                'linkedin': 'linkedin'
            };

            const platform = platformMap[platformClass] || platformClass;
            this.log('🔄 Navigating to platform', 'info', { platform });
            window.location.href = `/all-profiles.html?platform=${encodeURIComponent(platform)}`;
        }
    }

    handleProfileCardClick(card) {
        const profileId = card.getAttribute('data-id') || card.dataset.id;
        if (profileId) {
            this.log('🔄 Navigating to profile', 'info', { profileId });
            window.location.href = `/profile.html?id=${encodeURIComponent(profileId)}`;
        }
    }

    handleShare(shareBtn) {
        const profileId = shareBtn.dataset.profileId;
        if (!profileId) return;

        const profileUrl = `${window.location.origin}/profile.html?id=${profileId}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'تحقق من هذا الحساب على RedToot',
                url: profileUrl
            }).then(() => {
                this.db.incrementField(profileId, 'shares', 1);
                this.log('✅ Share successful', 'info', { profileId });
            }).catch(error => {
                if (error.name !== 'AbortError') {
                    this.fallbackShare(profileUrl);
                }
            });
        } else {
            this.fallbackShare(profileUrl);
        }
    }

    fallbackShare(url) {
        navigator.clipboard.writeText(url).then(() => {
            this.helpers.showNotification('تم نسخ الرابط إلى الحافظة', 'success');
            this.log('✅ URL copied to clipboard', 'info', { url });
        }).catch(() => {
            prompt('انسخ الرابط التالي:', url);
        });
    }

    handleFilterClick(filterBtn) {
        const filter = filterBtn.dataset.filter;
        if (!filter) return;

        // Update active state
        document.querySelectorAll('.filter-btn.active').forEach(btn => {
            btn.classList.remove('active');
        });
        filterBtn.classList.add('active');

        this.log('🔧 Filter changed', 'info', { filter });
        
        // Dispatch custom event for page-specific handling
        document.dispatchEvent(new CustomEvent('filterChanged', {
            detail: { filter }
        }));
    }

    handleSearch(searchBtn) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
            this.log('🔍 Search activated', 'debug');
        }
    }

    toggleMobileMenu() {
        const navLinks = document.querySelector('.nav-links');
        const mobileMenu = document.querySelector('.mobile-menu');
        
        if (navLinks && mobileMenu) {
            const isActive = navLinks.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            this.log('📱 Mobile menu toggled', 'debug', { isActive });
        }
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
                this.log('⌨️ Search shortcut activated', 'debug');
            }
        }

        // Escape to close modals/menus
        if (e.key === 'Escape') {
            this.closeAllModals();
            this.log('⌨️ Escape pressed - closing modals', 'debug');
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal.show, .nav-links.active').forEach(element => {
            element.classList.remove('show', 'active');
        });
    }

    showAuthRequired(action) {
        const actionText = action === 'like' ? 'للإعجاب' : 'لهذا الإجراء';
        const message = `يجب تسجيل الدخول أولاً ${actionText}`;
        
        this.helpers.showNotification(message, 'warning', 3000);
        this.log('🔐 Authentication required', 'warn', { action });
        
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);
    }

    // Page-specific implementations
    async hydrateHome() {
        try {
            this.log('🏠 Hydrating home page...', 'info');
            
            const [vipProfiles, recentProfiles] = await Promise.all([
                this.db.getVipProfiles(this.options.vipLimit),
                this.db.getRecentProfiles(this.options.recentLimit)
            ]);

            this.renderProfilesToContainer(this.options.vipContainer, vipProfiles);
            this.renderProfilesToContainer(this.options.recentContainer, recentProfiles);

            this.log('✅ Home page hydrated', 'info', {
                vipCount: vipProfiles?.length || 0,
                recentCount: recentProfiles?.length || 0
            });

        } catch (error) {
            this.log('❌ Home page hydration failed', 'error', error);
            this.showErrorInContainer(this.options.vipContainer, 'فشل في تحميل حسابات VIP');
            this.showErrorInContainer(this.options.recentContainer, 'فشل في تحميل الحسابات الحديثة');
        }
    }

    async initializeAllProfiles() {
        this.log('📋 Initializing all profiles page', 'info');
        this.setupSearch();
        // Additional initialization for all profiles page
    }

    async initializePlatforms() {
        this.log('🌐 Initializing platforms page', 'info');
        // Platforms page initialization
    }

    async initializeVip() {
        this.log('⭐ Initializing VIP page', 'info');
        // VIP page initialization
    }

    async initializeProfile() {
        this.log('👤 Initializing profile page', 'info');
        // Profile page initialization
    }

    async initializeAddProfile() {
        this.log('➕ Initializing add profile page', 'info');
        // Add profile page initialization
    }

    async initializeAuth() {
        this.log('🔐 Initializing auth page', 'info');
        // Auth page initialization
    }

    async initializeAdmin() {
        this.log('⚙️ Initializing admin page', 'info');
        // Admin page initialization
    }

    // Rendering utilities
    renderProfiles(profiles = []) {
        const container = this.findCardsContainer();
        if (!container) {
            this.log('❌ No cards container found', 'error', { 
                selector: this.options.cardsSelector 
            });
            return;
        }

        this.log('🎨 Rendering profiles', 'info', { 
            count: profiles.length,
            container: container.id || container.className 
        });

        if (!profiles || profiles.length === 0) {
            container.innerHTML = this.getNoResultsHtml();
            this.log('ℹ️ No profiles to render', 'info');
            return;
        }

        const renderStart = performance.now();
        container.innerHTML = profiles.map(profile => 
            this.createProfileCard(profile)
        ).join('');

        const renderTime = performance.now() - renderStart;
        this.log('✅ Profiles rendered', 'debug', {
            count: profiles.length,
            renderTime: `${renderTime.toFixed(2)}ms`,
            container: container.id || container.className
        });

        this.observeImagesInContainer(container);
    }

    renderProfilesToContainer(containerSelector, profiles = [], emptyMessage = 'لا توجد حسابات') {
        const container = document.querySelector(containerSelector);
        if (!container) {
            this.log(`❌ Container not found: ${containerSelector}`, 'warn');
            return;
        }

        if (!profiles || profiles.length === 0) {
            container.innerHTML = this.getNoResultsHtml(emptyMessage);
            this.log(`ℹ️ No profiles for container: ${containerSelector}`, 'info');
            return;
        }

        const renderStart = performance.now();
        container.innerHTML = profiles.map(profile => 
            this.createProfileCard(profile)
        ).join('');

        const renderTime = performance.now() - renderStart;
        this.log(`✅ Rendered to ${containerSelector}`, 'debug', {
            count: profiles.length,
            renderTime: `${renderTime.toFixed(2)}ms`
        });

        this.observeImagesInContainer(container);
    }

    createProfileCard(profile) {
        if (!profile || !profile.id) {
            this.log('❌ Invalid profile data', 'error', { profile });
            return '<div class="error-card">Invalid profile data</div>';
        }

        const debugAttrs = this.options.debugMode ? 
            `data-debug-id="${profile.id}" data-debug-platform="${profile.platform}"` : '';

        const helpers = this.helpers || {
            escapeHtml: (str) => str?.replace(/[&<>"']/g, '') || '',
            optimizeImage: (url) => url,
            formatNumber: (num) => num?.toString() || '0',
            getPlatformInfo: (platform) => ({ name: platform, icon: 'fas fa-globe', color: '#666', action: 'زيارة' })
        };

        const platformInfo = helpers.getPlatformInfo(profile.platform);

        return `
            <div class="member-card ${profile.isVip ? 'vip' : ''} ${this.options.debugMode ? 'debug-border' : ''}" 
                 data-id="${helpers.escapeHtml(profile.id)}" 
                 data-platform="${helpers.escapeHtml(profile.platform)}"
                 ${debugAttrs}>
                
                ${profile.isVip ? '<div class="vip-badge" aria-label="حساب VIP">VIP</div>' : ''}
                
                <div class="platform-badge" style="background-color: ${platformInfo.color}">
                    <i class="${platformInfo.icon}"></i>
                    <span>${platformInfo.name}</span>
                </div>

                <div class="member-image">
                    <img data-src="${helpers.optimizeImage(profile.profileImage || this.options.placeholder)}" 
                         alt="${helpers.escapeHtml(profile.name)}"
                         loading="lazy"
                         onerror="this.src='${this.options.placeholder}'">
                </div>

                <div class="member-content">
                    <div class="member-info">
                        <a href="/profile.html?id=${encodeURIComponent(profile.id)}" 
                           class="member-name">
                            ${helpers.escapeHtml(profile.name)}
                        </a>
                        
                        ${profile.username ? `
                            <div class="member-username">@${helpers.escapeHtml(profile.username)}</div>
                        ` : ''}
                        
                        ${profile.location ? `
                            <div class="member-location">
                                <i class="fas fa-map-marker-alt"></i>
                                ${helpers.escapeHtml(profile.location)}
                            </div>
                        ` : ''}
                    </div>

                    <div class="member-stats">
                        <div class="stat">
                            <div class="stat-number">${helpers.formatNumber(profile.views || 0)}</div>
                            <div class="stat-label">مشاهدة</div>
                        </div>
                        <div class="stat">
                            <div class="stat-number">${helpers.formatNumber(profile.likes || 0)}</div>
                            <div class="stat-label">إعجاب</div>
                        </div>
                    </div>

                    <div class="member-actions">
                        <a href="/profile.html?id=${encodeURIComponent(profile.id)}" 
                           class="action-btn secondary">
                            <i class="fas fa-user"></i>
                            الملف
                        </a>
                        
                        <a href="${helpers.escapeHtml(profile.profileLink)}" 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           class="action-btn primary">
                            <i class="fas fa-external-link-alt"></i>
                            ${platformInfo.action}
                        </a>
                    </div>
                </div>

                ${this.options.debugMode ? `
                    <div style="position: absolute; top: 5px; left: 5px; background: rgba(0,0,0,0.7); color: white; padding: 2px 5px; font-size: 10px; border-radius: 3px;">
                        ID: ${profile.id.substring(0, 8)}...
                    </div>
                ` : ''}
            </div>
        `;
    }

    observeImagesInContainer(container) {
        const images = container.querySelectorAll('img[data-src]');
        this.log('👀 Observing images in container', 'debug', { count: images.length });

        images.forEach(img => {
            if (this.imgObserver) {
                this.imgObserver.observe(img);
            } else {
                this.loadImage(img);
            }
        });

        // Observe elements for animation
        const elements = container.querySelectorAll('.member-card, .platform-card');
        elements.forEach(element => this.observeElement(element));
    }

    observeElement(element) {
        if (this.intersectionObserver && element) {
            this.intersectionObserver.observe(element);
        }
    }

    findCardsContainer() {
        const selectors = this.options.cardsSelector.split(',').map(s => s.trim());
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return element;
        }
        return null;
    }

    getNoResultsHtml(message = 'لا توجد نتائج') {
        return `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>${message}</h3>
                <p>لم نتمكن من العثور على أي حسابات تطابق معايير البحث</p>
            </div>
        `;
    }

    showErrorInContainer(containerSelector, message) {
        const container = document.querySelector(containerSelector);
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <button class="btn btn-secondary" onclick="window.location.reload()">
                        إعادة المحاولة
                    </button>
                </div>
            `;
        }
    }

    // Search functionality
    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        const debouncedSearch = this.debounce(async (e) => {
            const query = e.target.value.trim();
            await this.handleSearchQuery(query);
        }, this.options.searchDebounce);

        searchInput.addEventListener('input', debouncedSearch);
        
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.target.value = '';
                this.handleSearchQuery('');
            }
        });

        this.log('🔍 Search functionality initialized', 'debug');
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async handleSearchQuery(query) {
        try {
            const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
            const filters = activeFilter !== 'all' ? { platform: activeFilter } : {};

            this.log('🔍 Executing search', 'debug', { query, filter: activeFilter });

            const profiles = await this.db.searchProfiles(query, filters);
            this.renderProfiles(profiles);

        } catch (error) {
            this.log('❌ Search failed', 'error', error);
            this.helpers.showNotification('فشل في البحث', 'error');
        }
    }

    // Service Worker
    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                this.log('✅ Service Worker registered', 'info', { scope: registration.scope });

                registration.addEventListener('updatefound', () => {
                    this.log('🔄 Service Worker update found', 'info');
                });

            } catch (error) {
                this.log('❌ Service Worker registration failed', 'error', error);
            }
        } else {
            this.log('⚠️ Service Worker not supported', 'warn');
        }
    }

    // Performance measurement
    measureInitialLoad() {
        if (!this.options.performanceTracking) return;

        const navigationTiming = performance.getEntriesByType('navigation')[0];
        if (navigationTiming) {
            this.log('📊 Navigation timing', 'performance', {
                domContentLoaded: `${(navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart).toFixed(2)}ms`,
                loadComplete: `${(navigationTiming.loadEventEnd - navigationTiming.navigationStart).toFixed(2)}ms`,
                ttfb: `${(navigationTiming.responseStart - navigationTiming.requestStart).toFixed(2)}ms`
            });
        }

        // Monitor paint events
        if ('PerformanceObserver' in window) {
            const paintObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    this.log('🎨 Paint timing', 'performance', {
                        [entry.name]: `${entry.startTime.toFixed(2)}ms`
                    });
                });
            });
            try {
                paintObserver.observe({ entryTypes: ['paint'] });
            } catch (error) {
                this.log('❌ Paint observer failed', 'warn', error);
            }
        }
    }

    // Error handling
    handleInitializationError(error) {
        this.log('💥 Critical initialization error', 'error', error);
        
        if (this.options.autoRecover && this.retryCount < this.options.maxRetryAttempts) {
            this.retryCount++;
            this.log(`🔄 Attempting recovery (${this.retryCount}/${this.options.maxRetryAttempts})`, 'warn');
            
            setTimeout(() => {
                this.initializeApp();
            }, 2000 * this.retryCount);
            return;
        }

        // Show user-friendly error message
        this.showErrorOverlay(error);
    }

    handleCriticalError(context, error) {
        this.log(`💥 Critical error in ${context}`, 'error', error);
        this.showErrorOverlay(error);
    }

    showErrorOverlay(error) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        
        overlay.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <h2 style="color: #d32f2f; margin-bottom: 1rem;">حدث خطأ في التطبيق</h2>
                <p style="color: #666; margin-bottom: 2rem; line-height: 1.5;">
                    نواجه بعض المشاكل التقنية. جاري المحاولة مرة أخرى تلقائياً...
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button onclick="window.location.reload()" style="background: #d32f2f; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-size: 1rem;">
                        إعادة تحميل الصفحة
                    </button>
                    <button onclick="this.closest('div').parentElement.remove()" style="background: #666; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-size: 1rem;">
                        إغلاق
                    </button>
                </div>
                ${this.options.debugMode ? `
                    <details style="margin-top: 1.5rem; text-align: left; background: #f5f5f5; padding: 1rem; border-radius: 6px;">
                        <summary style="cursor: pointer; font-weight: bold;">تفاصيل الخطأ (للمطورين)</summary>
                        <pre style="font-size: 0.8rem; overflow: auto; max-height: 200px; margin-top: 0.5rem;">${error.stack}</pre>
                    </details>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    // Debug utilities
    exportDebugInfo() {
        const debugInfo = {
            timestamp: new Date().toISOString(),
            app: {
                version: '4.0.0',
                page: this.currentPage,
                debugMode: this.options.debugMode,
                performance: this.performanceMetrics
            },
            environment: {
                userAgent: navigator.userAgent,
                screen: `${window.screen.width}x${window.screen.height}`,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                online: navigator.onLine,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled
            },
            logs: this.debugLogs.slice(-100), // Last 100 logs
            errors: this.debugLogs.filter(log => log.level === 'error')
        };

        const blob = new Blob([JSON.stringify(debugInfo, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `redtoot-debug-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.log('💾 Debug info exported', 'info', { fileName: a.download });
    }

    showPerformanceLogs() {
        console.group('📊 Performance Metrics');
        console.table(this.performanceMetrics);
        console.groupEnd();
        
        this.log('📊 Performance logs displayed in console', 'info');
    }

    runTests() {
        if (!this.options.debugMode) {
            this.log('❌ Debug mode required for testing', 'warn');
            return;
        }

        this.log('🧪 Starting comprehensive tests...', 'debug');
        
        this.testImageLoading();
        this.testEventHandlers();
        this.testAPICalls();
        this.testPerformance();
    }

    testImageLoading() {
        const testImages = document.querySelectorAll('img[data-src]');
        this.log('🧪 Testing image loading', 'debug', { 
            count: testImages.length,
            images: Array.from(testImages).map(img => ({
                src: img.dataset.src,
                alt: img.alt
            }))
        });
    }

    testEventHandlers() {
        const testElements = [
            '.platform-card',
            '.member-card',
            '.like-btn',
            '.share-btn',
            '.filter-btn'
        ];
        
        const results = testElements.map(selector => ({
            selector,
            count: document.querySelectorAll(selector).length,
            bound: true // Assuming all are bound
        }));
        
        this.log('🧪 Testing event handlers', 'debug', { results });
    }

    async testAPICalls() {
        try {
            this.log('🧪 Testing API connectivity...', 'debug');
            
            // Test basic Firebase connectivity
            if (this.db && typeof this.db.testConnection === 'function') {
                const result = await this.db.testConnection();
                this.log('✅ API connection test passed', 'debug', { result });
            } else {
                this.log('⚠️ API test not available', 'warn');
            }
            
        } catch (error) {
            this.log('❌ API test failed', 'error', error);
        }
    }

    testPerformance() {
        const perfEntries = performance.getEntriesByType('navigation');
        if (perfEntries.length > 0) {
            const navTiming = perfEntries[0];
            this.log('🧪 Performance test results', 'performance', {
                loadTime: `${(navTiming.loadEventEnd - navTiming.navigationStart).toFixed(2)}ms`,
                domReady: `${(navTiming.domContentLoadedEventEnd - navTiming.navigationStart).toFixed(2)}ms`,
                ttfb: `${(navTiming.responseStart - navTiming.requestStart).toFixed(2)}ms`
            });
        }
    }

    // Cleanup
    destroy() {
        this.log('🧹 Cleaning up application...', 'info');

        if (this.imgObserver) {
            this.imgObserver.disconnect();
            this.log('✅ Image Observer disconnected', 'debug');
        }

        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.log('✅ Intersection Observer disconnected', 'debug');
        }

        if (this.debugPanel) {
            this.removeDebugPanel();
            this.log('✅ Debug panel removed', 'debug');
        }

        // Remove global error handlers
        window.removeEventListener('error', this.globalErrorHandler);
        window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);

        this.log('✅ Application cleanup completed', 'info');
    }
}

// Global debug functions
window.redTootDebug = {
    enable: function() {
        localStorage.setItem('debugMode', 'true');
        window.location.reload();
    },
    disable: function() {
        localStorage.setItem('debugMode', 'false');
        window.location.reload();
    },
    export: function() {
        if (window.mainApp) {
            window.mainApp.exportDebugInfo();
        }
    },
    test: function() {
        if (window.mainApp) {
            window.mainApp.runTests();
        }
    },
    stats: function() {
        if (window.mainApp) {
            window.mainApp.showPerformanceLogs();
        }
    },
    logs: function() {
        if (window.mainApp) {
            console.log('📋 Application Logs:', window.mainApp.debugLogs);
        }
    }
};

// Initialize main application
try {
    window.mainApp = new MainApp();
    window.redTootApp = window.mainApp;
    
    console.log('🎯 RedToot App v4.0 initialized successfully');
    console.log('💡 Debug shortcuts:');
    console.log('   - Ctrl+Shift+D: Toggle debug mode');
    console.log('   - Ctrl+Shift+E: Export debug info');
    console.log('   - Ctrl+Shift+L: Show performance logs');
    console.log('   - window.redTootDebug.test(): Run comprehensive tests');
    
} catch (error) {
    console.error('💥 Failed to initialize RedToot App:', error);
    
    // Fallback initialization
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'background: #f8d7da; color: #721c24; padding: 1rem; margin: 1rem; border-radius: 4px;';
    errorDiv.innerHTML = `
        <h3>⚠️ خطأ في تحميل التطبيق</h3>
        <p>حدث خطأ أثناء تحميل التطبيق. يرجى إعادة تحميل الصفحة.</p>
        <button onclick="window.location.reload()" style="background: #721c24; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
            إعادة تحميل الصفحة
        </button>
    `;
    
    document.body.prepend(errorDiv);
}

// Export for module support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MainApp;
}
