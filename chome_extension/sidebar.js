console.log("WAHJDIAWCDAW")

document.addEventListener('DOMContentLoaded', function () {
    var toggleButton = document.getElementById('toggle-button');
    toggleButton.addEventListener('click', function () {
        console.log("WAHJDIAWCDAW")
        var sidebar = document.getElementById('mySidebar');
        if (sidebar.style.display === 'none' || sidebar.style.display === '') {
            sidebar.style.display = 'block';
        } else {
            sidebar.style.display = 'none';
        }
    });
});