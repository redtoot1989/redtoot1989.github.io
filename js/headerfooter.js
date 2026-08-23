// Wait for the DOM to be fully loaded before executing the code
document.addEventListener('DOMContentLoaded', async () => {
    
    // Async function to load HTML content into a specific element
    const loadContent = async (id, url) => {
        // Find the target element by its ID
        const target = document.getElementById(id);
        
        // If element doesn't exist, log error and exit
        if (!target) return console.error(`Element not found: ${id}`);
        
        try {
            // Fetch the HTML content from the specified URL
            const res = await fetch(url);
            
            // Check if the response is successful (status 200-299)
            if(!res.ok) throw new Error(res.statusText);
            
            // Insert the fetched HTML content into the target element
            target.innerHTML = await res.text();
        } catch (e) {
            // Display error message in Arabic if loading fails
            target.innerHTML = `<div class="error">تعذر تحميل ${id}</div>`;
            
            // Log the error to console for debugging
            console.error(e);
        }
    };

    // Load header and footer simultaneously using Promise.all
    // Promise.all waits for ALL promises to resolve
    await Promise.all([
        loadContent('header','../header.html'),  // Load header content
        loadContent('footer','../footer.html')   // Load footer content
    ]);

    // Check if the redTootApp exists and has an init function
    // If yes, call the init function to initialize the application
    if(window.redTootApp && typeof redTootApp.init === 'function') {
        redTootApp.init();
    }
});
