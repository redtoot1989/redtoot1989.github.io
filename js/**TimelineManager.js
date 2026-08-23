// TimelineManager.js (Improved Version)
export class TimelineManager {
    constructor({ db, helpers, authManager }) {
        this.db = db;
        this.helpers = helpers;
        this.authManager = authManager;

        this.container = document.getElementById('timeline-container');
        this.loaderEl = document.getElementById('timeline-loader');

        this.posts = [];
        this.lastDoc = null;
        this.pageSize = 10;
        this.loading = false;
        this.reachedEnd = false;

        this.handleScroll = this.debounce(this.handleScroll.bind(this), 250);

        this.init();
    }

    // ----------------------------
    // INIT
    // ----------------------------
    async init() {
        if (!this.container) {
            console.warn('Timeline container not found');
            return;
        }

        window.addEventListener('scroll', this.handleScroll);
        await this.loadPosts();
    }

    // ----------------------------
    // LOAD POSTS
    // ----------------------------
    async loadPosts() {
        if (this.loading || this.reachedEnd) return;

        this.loading = true;
        this.showLoader(true);

        try {
            let query = this.db.collection('posts')
                .orderBy('createdAt', 'desc')
                .limit(this.pageSize);

            if (this.lastDoc) query = query.startAfter(this.lastDoc);

            const snapshot = await query.get();

            if (snapshot.empty) {
                this.reachedEnd = true;
                return;
            }

            this.lastDoc = snapshot.docs[snapshot.docs.length - 1];

            const newPosts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            this.posts.push(...newPosts);
            this.renderPosts(newPosts);

        } catch (err) {
            console.error('Failed to load posts:', err);
            this.helpers.showNotification('حدث خطأ أثناء تحميل المشاركات', 'error');
        } finally {
            this.loading = false;
            this.showLoader(false);
        }
    }

    // ----------------------------
    // RENDER POSTS
    // ----------------------------
    renderPosts(posts) {
        if (!this.container || !posts?.length) return;

        const fragment = document.createDocumentFragment();

        posts.forEach(post => {
            const postEl = document.createElement('div');
            postEl.className = 'timeline-post';
            postEl.dataset.id = post.id;

            const author = post.author || 'مجهول';
            const time = post.createdAt?.toDate?.().toLocaleString?.() || '';

            postEl.innerHTML = `
                <div class="post-header">
                    <span class="post-author">${this.escapeHTML(author)}</span>
                    <span class="post-time">${this.escapeHTML(time)}</span>
                </div>
                <div class="post-content">${this.escapeHTML(post.content || '')}</div>
                <div class="post-actions">
                    <button class="like-btn">
                        ❤️ <span>${post.likes || 0}</span>
                    </button>
                    <button class="comment-btn">
                        💬 <span>${post.comments || 0}</span>
                    </button>
                </div>
            `;

            this.attachPostEvents(postEl, post);
            fragment.appendChild(postEl);
        });

        this.container.appendChild(fragment);
    }

    // ----------------------------
    // EVENTS
    // ----------------------------
    attachPostEvents(postEl, post) {
        const likeBtn = postEl.querySelector('.like-btn');
        const commentBtn = postEl.querySelector('.comment-btn');

        likeBtn?.addEventListener('click', () => this.likePost(post, likeBtn));
        commentBtn?.addEventListener('click', () => this.openComments(post));
    }

    async likePost(post, btn) {
        if (!this.authManager.isAuthenticated()) {
            return this.helpers.showNotification(
                'يجب تسجيل الدخول للإعجاب بالمشاركات',
                'warning'
            );
        }

        try {
            const userId = this.authManager.getUser().uid;
            const likedBy = post.likedBy || [];

            if (likedBy.includes(userId)) return; // Already liked

            likedBy.push(userId);
            post.likes = likedBy.length;
            post.likedBy = likedBy;

            await this.db.collection('posts').doc(post.id).update({
                likes: post.likes,
                likedBy
            });

            btn.querySelector('span').textContent = post.likes;

        } catch (err) {
            console.error('Failed to like post:', err);
            this.helpers.showNotification('تعذر تسجيل الإعجاب', 'error');
        }
    }

    openComments(post) {
        this.helpers.showModal('commentsModal', { postId: post.id });
    }

    // ----------------------------
    // SCROLL HANDLING
    // ----------------------------
    handleScroll() {
        if (this.loading || this.reachedEnd) return;

        const threshold = 350;
        const position = window.innerHeight + window.scrollY;
        const bottom = document.body.offsetHeight - threshold;

        if (position >= bottom) {
            this.loadPosts();
        }
    }

    // ----------------------------
    // UTILS
    // ----------------------------
    showLoader(show) {
        if (this.loaderEl) {
            this.loaderEl.style.display = show ? 'block' : 'none';
        }
    }

    refreshTimeline() {
        this.container.innerHTML = '';
        this.posts = [];
        this.lastDoc = null;
        this.reachedEnd = false;
        this.loadPosts();
    }

    // Prevent XSS
    escapeHTML(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Debounce function
    debounce(func, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), delay);
        };
    }
}

