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

const statsBtn = document.getElementById("stats-btn");
if (statsBtn) {
  statsBtn.addEventListener("click", () => {
    if (typeof window.AndroidBridge !== "undefined") {
      window.AndroidBridge.showLeaderboard("");
    }
  });
}