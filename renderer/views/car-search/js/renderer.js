document.addEventListener("DOMContentLoaded", function() {
    fetch("top-bar.html")
        .then(response => response.text())
        .then(data => {
            document.getElementById("top-bar-container").innerHTML = data;
        })
        .catch(error => console.error('Error loading top-bar:', error));

    fetch('..\\static\\sidebar.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('sidebar-placeholder').innerHTML = data;
        })
        .catch(error => console.error('Error loading sidebar:', error));
});
