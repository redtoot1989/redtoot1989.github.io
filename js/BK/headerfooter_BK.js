document.addEventListener('DOMContentLoaded', async () => {
    const loadContent = async (id, url) => {
        const target = document.getElementById(id);
        if (!target) return console.error(`Element not found: ${id}`);
        try {
            const res = await fetch(url);
            if(!res.ok) throw new Error(res.statusText);
            target.innerHTML = await res.text();
        } catch (e) {
            target.innerHTML = `<div class="error">تعذر تحميل ${id}</div>`;
            console.error(e);
        }
    };

    await Promise.all([
        loadContent('header','../header.html'),
        loadContent('footer','../footer.html')
    ]);

    if(window.redTootApp && typeof redTootApp.init === 'function') {
        redTootApp.init();
    }
});

