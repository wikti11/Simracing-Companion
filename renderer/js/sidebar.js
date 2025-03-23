// sidebar.js
document.addEventListener('DOMContentLoaded', function() {
    // Reference to sidebar elements
    const sidebar = document.getElementById('sidebar');
    const toggleButton = document.getElementById('toggle-sidebar');
    const navigationButtons = document.querySelectorAll('.sidebar-button[data-page]');
    
    // Toggle sidebar collapse/expand
    toggleButton.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        
        // Store the state in localStorage to persist between page loads
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    });
    
    // Load saved sidebar state
    const savedCollapsedState = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsedState === 'true') {
        sidebar.classList.add('collapsed');
    }
    
    // Add click event listeners to all navigation buttons
    navigationButtons.forEach(button => {
        button.addEventListener('click', function() {
            const pageName = this.getAttribute('data-page');
            if (pageName) {
                // Use the IPC method exposed in preload.js to navigate
                window.api.navigateTo(pageName);
            }
        });
    });
    
    // Highlight the current active page in sidebar
    const highlightActivePage = () => {
        // Get current page from URL
        const currentPath = window.location.pathname;
        const filename = currentPath.substring(currentPath.lastIndexOf('/') + 1);
        const currentPage = filename.replace('.html', '');
        
        // Remove active class from all buttons
        navigationButtons.forEach(button => {
            button.classList.remove('active');
        });
        
        // Add active class to current page button
        const activeButton = document.querySelector(`.sidebar-button[data-page="${currentPage}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    };
    
    // Call once on load
    highlightActivePage();
});