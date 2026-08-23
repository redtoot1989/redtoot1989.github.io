/**
 * Components Manager
 * Dynamic HTML component loader with lazy loading, retries, and per-component initialization.
 */

class ComponentsManager {
    constructor() {
        // Map of componentName → { html, elements }
        this.components = new Map();

        // Set of component names that have been successfully loaded
        this.loadedComponents = new Set();

        // Optional shared helper utilities
        this.helpers = window.AppHelpers;

        // Begin initialization
        this.init();
    }

    /**
     * Main initialization sequence.
     * Loads critical components immediately and prepares lazy-loading.
     */
    async init() {
        await this.loadCriticalComponents();
        this.setupLazyLoading();
    }

    /**
     * Loads essential UI components that must be present at page start.
     */
    async loadCriticalComponents() {
        try {
            await Promise.all([
                this.loadComponent("header"),
                this.loadComponent("footer"),
            ]);

            console.log("✅ Critical components loaded");
        } catch (error) {
            console.error("❌ Failed to load critical components:", error);
        }
    }

    /**
     * Loads an HTML component from its .html file and injects it into all matching placeholders.
     *
     * @param {string} componentName - Name of the component (file must be `${name}.html`)
     * @param {object} options
     * @param {string} [options.placeholder] - Placeholder ID or data attribute
     * @param {boolean} [options.lazy] - Whether this was triggered by lazy loading
     * @param {number} [options.retryCount] - How many retries remain upon failure
     */
    async loadComponent(componentName, options = {}) {
        // Do not load a component twice
        if (this.loadedComponents.has(componentName)) {
            return true;
        }

        const {
            placeholder = `component-${componentName}`,
            lazy = false,
            retryCount = 3,
        } = options;

        try {
            const response = await fetch(`${componentName}.html`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();

            // Find all valid placeholders for this component
            const placeholders = document.querySelectorAll(
                `#${placeholder}, [data-component="${componentName}"]`
            );

            if (placeholders.length === 0) {
                console.warn(`⚠ No placeholder found for component: ${componentName}`);
                return false;
            }

            // Inject HTML into each placeholder
            placeholders.forEach((element) => {
                element.innerHTML = html;
                this.initializeComponent(componentName, element);
            });

            this.loadedComponents.add(componentName);
            this.components.set(componentName, { html, elements: placeholders });

            console.log(`✅ Component loaded: ${componentName}`);
            return true;

        } catch (error) {
            console.error(`❌ Failed to load component "${componentName}":`, error);

            // Retry loading
            if (retryCount > 0) {
                console.log(`🔄 Retrying ${componentName}... (${retryCount} retries left)`);
                return this.loadComponent(componentName, {
                    ...options,
                    retryCount: retryCount - 1,
                });
            }

            // Display error UI
            this.showComponentError(componentName);
            return false;
        }
    }

    /**
     * Runs component-specific initialization logic.
     * This function dispatches a `componentLoaded` event after setup.
     */
    initializeComponent(componentName, element) {
        switch (componentName) {
            case "header":
                this.initializeHeader(element);
                break;

            case "footer":
                this.initializeFooter(element);
                break;
        }

        // Broadcast that the component is ready
        element.dispatchEvent(
            new CustomEvent("componentLoaded", {
                detail: { componentName, element },
            })
        );
    }

    /**
     * Initialization logic for the header component.
     * Handles mobile menu toggling and responsive interactions.
     */
    initializeHeader(headerElement) {
        const mobileMenuBtn = headerElement.querySelector(".mobile-menu");
        const navLinks = headerElement.querySelector(".nav-links");

        if (!mobileMenuBtn || !navLinks) return;

        // Toggle mobile menu
        mobileMenuBtn.addEventListener("click", () => {
            navLinks.classList.toggle("active");
            mobileMenuBtn.classList.toggle("active");
        });

        // Close mobile menu automatically when clicking a link
        headerElement.querySelectorAll(".nav-links a").forEach((link) => {
            link.addEventListener("click", () => {
                navLinks.classList.remove("active");
                mobileMenuBtn.classList.remove("active");
            });
        });
    }

    /**
     * Initialization logic for the footer component.
     * Add footer-related scripting here.
     */
    initializeFooter(footerElement) {
        // Footer-specific behavior can be added here.
    }

    /**
     * Sets up IntersectionObserver to lazily load components when they appear in viewport.
     */
    setupLazyLoading() {
        if (!("IntersectionObserver" in window)) {
            console.warn("⚠ IntersectionObserver not supported; lazy loading disabled.");
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                const componentName = entry.target.dataset.lazyComponent;
                if (componentName && !this.loadedComponents.has(componentName)) {
                    this.loadComponent(componentName, { lazy: true });
                }

                // Stop observing this element once triggered
                observer.unobserve(entry.target);
            });
        });

        // Observe all lazy-loading elements
        document.querySelectorAll("[data-lazy-component]").forEach((el) => {
            observer.observe(el);
        });
    }

    /**
     * Displays an error message inside the component placeholder when loading fails.
     */
    showComponentError(componentName) {
        const placeholders = document.querySelectorAll(`[data-component="${componentName}"]`);

        placeholders.forEach((placeholder) => {
            placeholder.innerHTML = `
                <div class="component-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load component: <strong>${componentName}</strong></p>
                    <button onclick="componentsManager.loadComponent('${componentName}')">
                        Retry
                    </button>
                </div>
            `;
        });
    }

    /**
     * Returns raw HTML for a component (useful for SSR or debugging).
     */
    getComponent(componentName) {
        return this.components.get(componentName)?.html || null;
    }

    /**
     * Checks if a component has already been loaded.
     */
    isComponentLoaded(componentName) {
        return this.loadedComponents.has(componentName);
    }

    /**
     * Forces a component to reload from disk.
     */
    async reloadComponent(componentName) {
        this.loadedComponents.delete(componentName);
        this.components.delete(componentName);
        return this.loadComponent(componentName);
    }
}

// Create manager instance globally
window.componentsManager = new ComponentsManager();

