//WELCOME
try {
    if (sessionStorage.getItem("welcomeSeen")) {
      document.documentElement.classList.add("skip-welcome");
    }
  } catch (e) {}
// WELCOME: shown once per session (flag is set in sessionStorage)
  (function () {
    var screenEl = document.getElementById("welcomeScreen");
    if (!screenEl) return;
    if (document.documentElement.classList.contains("skip-welcome")) {
      screenEl.style.display = "none";
      return;
    }
    screenEl.addEventListener("click", function () {
      try { sessionStorage.setItem("welcomeSeen", "1"); } catch (e) {}
      screenEl.classList.add("fade-out");
      setTimeout(function () { screenEl.style.display = "none"; }, 900);
    });
  })();
//STATS BUTTON
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


 //traduccion
const translations = {
  es: {
   title: "Razonamiento Espacial",
tutorial: '🎓 Ver tutorial',
level: "Selecciona nivel",
settings: "💡 Configuración",
theme: "Selecciona tema",
color1: "Morado",
color2: "Verde",
color3: "Marrón",
android: "*Flip-O también está disponible para dispositivos Android en Google Play Store.",
close: "Cerrar",
puzzle: "Selecciona un acertijo para jugar",
victory: "Intenta realizar<br> menos movimientos",
goback: "Volver",
tuto2: "Cómo jugar",
tuto3: "Traza un camino",
tuto4: "Mueve el dedo alrededor",
tuto5: "Sin cruzar el camino",
tuto6: "Las casillas cambian",
tuto7: "Las casillas que toques",
tuto8: "cambian de color.",
tuto9: "El exterior es libre",
tuto10: "Las casillas vacias alrededor",
tuto11: "nunca cambian. Úsalas",
tuto12: "para desplazarte.",
tuto13: "Coincide Columnas",
tuto14: "Ganas cuando cada columna",
tuto15: "es de un solo color: negro",
tuto16: "o blanco.",
tuto17: "Un trazo por intento. Si fallas se reinicia.",
puzzle3: "Las casillas vacías con una «X» están bloqueadas",
puzzle4: "Haz cada Columna del mismo Color",
row: "Haz que cada FILA tenga la misma FORMA: Estrella o Corazón",
win: "¡Completado! - Buen trabajo ⭐",
fail: "Inténtalo de nuevo - Haz cada columna de UN solo color",
moves: "Total de movimientos",
fail2: "Inténtalo de nuevo - Haz cada Fila de una sola Forma",
mixed: "Paso 1: Haz que todas las columnas tengan la misma forma<br>Paso 2: Haz que cada fila sea de un solo color",
 fail3: "Intentalo de nuevo",
 paso1: "✔ Paso 1",
 paso2: "Continua con Paso 2",
  },

  en: {
    title: "Spatial Reasoning Puzzles",
    tutorial: '🎓 See Tutorial',
    level: "Select Level",
    settings: "💡 Settings",
  	theme: "Select Theme",
    color1: "Purple",
    color2: "Green",
    color3: "Brown",
    android: "*Flip-O is also available for Android devices in the Google Play Store.",
      close: "Close",
      puzzle: "Select a Puzzle to Play",
      victory: "Try Making<br> Less Moves",
      goback: "Go Back ",
    tuto2: "How to Play",
tuto3: "Swipe a path",
tuto4: "Drag across touching tiles.",
tuto5: "A path can't cross itself.",
tuto6: "Tiles flip",
tuto7: "Every board tile you touch",
tuto8: "switches color.",
tuto9: "The exterior is free",
tuto10: "Dotted tiles around the",
tuto11: "board never flip. Use them",
tuto12: "to travel.",
tuto13: "Make columns match",
tuto14: "You win when every column",
tuto15: "is a single color, black",
tuto16: "or white.",
tuto17: "One stroke per try. Not solved? It resets.",
puzzle3: "Empty Tiles with an X are Blocked",
puzzle4: "Make Every COLUMN Black or White",
    row: "Make Every ROW the Same SHAPE, Star or Heart",
    win: "Completed! - Great Job ⭐",
fail: "Try Again - Make Every Column ONE Color",
moves: "Total moves",
    fail2: "Try Again - Make Every Row ONE Shape",
    mixed: "Step 1: Make Every Column Same Shape<br>Step 2: Make Every Row One Color",
    fail3: "Try Again",
    paso1: "✔ Step 1",
 paso2: "Continue with Step 2",
  }
};

function t(key) {
  return (translations[currentLang] && translations[currentLang][key])
      || translations.en[key]
      || "";
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    el.innerHTML = translations[lang][key] || "";
  });
}

function detectLanguage() {
  const lang = navigator.language || navigator.userLanguage;

  if (!lang) return "en";

  // normalize (es-MX → es)
  const shortLang = lang.toLowerCase().split("-")[0];

  // supported languages
  if (shortLang === "es") return "es";
  if (shortLang === "en") return "en";

  // fallback
  return "en";
}

let currentLang;

function initLanguage() {
  const saved = localStorage.getItem("lang");

  if (saved) {
    currentLang = saved;
  } else {
    currentLang = detectLanguage();
  }

  setLanguage(currentLang);
}

initLanguage();

 if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
  }
