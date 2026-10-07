//WELCOME
const welcomeScreen = document.getElementById("welcomeScreen");
const enterBtn = document.getElementById("enterBtn");

enterBtn.addEventListener("click", () => {
  welcomeScreen.classList.add("fade-out");

  setTimeout(() => {
    welcomeScreen.style.display = "none";
  }, 900);

});
welcomeScreen.addEventListener("click", () => {
  enterBtn.click();
});

const statsBtn = document.getElementById("stats-stars");
if (statsBtn) {
  statsBtn.addEventListener("click", () => {
    if (typeof window.AndroidBridge !== "undefined") {
      window.AndroidBridge.showLeaderboard("");
    }
  });
}

// Opens and closes the "How to play" modal on the main menu.
(function () {
    const openBtn = document.getElementById('tutorial-btn');
    const modal = document.getElementById('tutorial-modal');
    const closeBtn = document.getElementById('tutorial-close');

    // Do nothing if this page doesn't have the tutorial markup
    if (!openBtn || !modal || !closeBtn) return;

    function openTutorial() {
        modal.hidden = false;
        closeBtn.focus();
    }

    function closeTutorial() {
        modal.hidden = true;
        openBtn.focus(); // give focus back to the button that opened it
    }

    openBtn.addEventListener('click', openTutorial);
    closeBtn.addEventListener('click', closeTutorial);

    // Tap or click outside the image to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeTutorial();
    });

    document.addEventListener('keydown', (e) => {
        if (modal.hidden) return;
        if (e.key === 'Escape') {
            closeTutorial();
        } else if (e.key === 'Tab') {
            // The close button is the only control in the modal, so keep focus on it
            e.preventDefault();
            closeBtn.focus();
        }
    });
})();

