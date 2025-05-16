import { initializeAdminPopup } from "./modules/admin_popup.js";
import {
  changeAudioSpeed,
  initializeAudioSpeed,
  playNextAudio,
  playPreviousAudio,
  togglePlayPause,
  toggleReadAloud,
  initializeTtsQuickToggle,
} from "./modules/audio.js";
import { initializeWordByWordHighlighter } from "./modules/tts_highlighter.js";
import { getCookie } from "./modules/cookies.js";
import {
  handleInitializationError,
  showMainContent,
} from "./modules/error_utils.js";
import { loadAtkinsonFont } from "./modules/font_utils.js";
import {
  initializeLanguageDropdown,
  cacheInterfaceElements,
  getCachedInterface,
  getCachedNavigation,
  initializePlayBar,
  initializeSidebar,
  loadEasyReadMode,
  restoreInterfaceElements,
  switchLanguage,
  toggleEasyReadMode,
  toggleSyllablesMode,
  toggleGlossaryMode,
  highlightGlossaryTerms,
  loadGlossaryTerms,
  togglePlayBarSettings,
  toggleSidebar,
  updatePageNumber,
  formatNavigationItems,
  initializeNavigation,
  toggleStateMode,
  loadStateMode,
  toggleSignLanguageMode,
  loadSignLanguageMode,
  adjustLayout
  //checkWindowsScaling
  //adjustPageScale
} from "./modules/interface.js";
import { initializeZoomController, testZoomNow } from "./modules/browser_zoom_controller.js";
import {
  handleKeyboardShortcuts,
  handleNavigation,
  nextPage,
  toggleNav,
  previousPage,
  setupClickOutsideHandler,
} from "./modules/navigation.js";
import { setState, state } from "./modules/state.js";
import { setupTranslations } from "./modules/translations.js";
import {
  initializeAutoplay,
  loadAutoplayState,
  loadDescribeImagesState,
  loadGlossaryState,
  loadToggleButtonState,
  toggleAutoplay,
  toggleDescribeImages,
  toggleEli5Mode,
  handleEli5Popup,
  initializeAudioElements,
  initializeGlossary,
  initializeTabs,
  initializeReferencePage
} from "./modules/ui_utils.js";
import {
  toggleNotepad,
  saveNotes,
  loadSavedNotes,
  loadNotePad,
} from "./modules/notepad.js";
import { prepareActivity } from "./activity.js";
import { initCharacterDisplay } from "./modules/character-display.js"
import { initMatomo } from "./modules/analytics.js";

// Constants
const PLACEHOLDER_TITLE = "Accessible Digital Textbook";
const basePath = window.location.pathname.substring(
  0,
  window.location.pathname.lastIndexOf("/") + 1
);

// Create a centralized asset loader
const assetLoader = {
  cache: new Map(),
  
  async load(paths) {
    try {
      const promises = paths.map(path => 
        this.cache.has(path) ? 
          Promise.resolve(this.cache.get(path)) : 
          fetch(path)
            .then(response => {
              if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
              return response.text();
            })
            .then(content => {
              this.cache.set(path, content);
              return content;
            })
      );
      
      return await Promise.all(promises);
    } catch (error) {
      console.error("Error loading assets:", error);
      throw error;
    }
  }
};

// Element cache to avoid repetitive DOM lookups
const elementCache = {
  _cache: new Map(),
  
  get(id) {
    if (!this._cache.has(id)) {
      const element = document.getElementById(id);
      this._cache.set(id, element);
    }
    return this._cache.get(id);
  },
  
  getAll(selector) {
    const key = `selector:${selector}`;
    if (!this._cache.has(key)) {
      const elements = document.querySelectorAll(selector);
      this._cache.set(key, elements);
    }
    return this._cache.get(key);
  },
  
  clear() {
    this._cache.clear();
  }
};

// Initialize the application
document.addEventListener("DOMContentLoaded", async function () {
  try {
    await initializeApp();
  } catch (error) {
    console.error("Error initializing application:", error);
    handleInitializationError();
  }
});

// Store the current page state before leaving
window.addEventListener("beforeunload", () => {
  cacheInterfaceElements();
  //saveInterfaceState();
});

// Create a structured initialization sequence
async function initializeApp() {
  try {
    showLoadingIndicator();
    addFavicons();
    
    // Ensure DOM is ready
    await waitForDOM();
    
    // Initialize in a specific sequence with dependencies
    const initSequence = [
      { 
        name: "Core", 
        fn: initializeCoreFunctionality 
      },
      { 
        name: "EventListeners", 
        fn: setupEventListeners, 
        dependencies: ["Core"] 
      },
      { 
        name: "UI", 
        fn: initializeUIComponents, 
        dependencies: ["Core", "EventListeners"] 
      },
      { 
        name: "WordHighlighter", 
        fn: initializeWordByWordHighlighter, 
        dependencies: ["UI"] 
      },
      { 
        name: "Final", 
        fn: finalizeInitialization, 
        dependencies: ["UI", "WordHighlighter"] 
      }
    ];
    
    for (const step of initSequence) {
      console.log(`Initializing: ${step.name}`);
      await step.fn();
    }
  } catch (error) {
    console.error("Error in initialization:", error);
    handleInitializationError(error);
  } finally {
    showMainContent();
    hideLoadingIndicator();
  }
}

// Add this function in the initializeApp() function

function addFavicons() {
  const faviconLinks = [
    { rel: "icon", type: "image/x-icon", href: "./assets/favicon_io/favicon.ico" },
    { rel: "apple-touch-icon", sizes: "180x180", href: "./assets/favicon_io/apple-touch-icon.png" },
    { rel: "icon", type: "image/png", sizes: "32x32", href: "./assets/favicon_io/favicon-32x32.png" },
    { rel: "icon", type: "image/png", sizes: "16x16", href: "./assets/favicon_io/favicon-16x16.png" },
    { rel: "manifest", href: "./assets/favicon_io/site.webmanifest" }
  ];

  faviconLinks.forEach(linkData => {
    // Check if link already exists to avoid duplicates
    const exists = Array.from(document.head.querySelectorAll('link')).some(
      link => link.rel === linkData.rel && link.href.includes(linkData.href.split('/').pop())
    );
    
    if (!exists) {
      const link = document.createElement('link');
      for (const [attr, value] of Object.entries(linkData)) {
        link.setAttribute(attr, value);
      }
      document.head.appendChild(link);
    }
  });
}

function waitForDOM() {
  return new Promise((resolve) => {
    if (document.readyState === "complete") {
      resolve();
    } else {
      window.addEventListener("load", resolve);
    }
  });
}

function showLoadingIndicator() {
  const loader = document.createElement("div");
  loader.id = "app-loader";
  loader.className =
    "fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white z-50";
  loader.innerHTML = `
       <div class="text-center">
           <div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
           <p class="mt-4 text-gray-600">Loading...</p>
       </div>
   `;
  document.body.appendChild(loader);
}

function hideLoadingIndicator() {
  const loader = document.getElementById("app-loader");
  if (loader) {
    loader.remove();
  }
}

function restoreNavAndSidebar() {
  const navPopup = document.getElementById("navPopup");
  const sidebar = document.getElementById("sidebar");

  if (navPopup) navPopup.classList.remove("hidden");
  if (sidebar) sidebar.classList.remove("hidden");
}

function hideMainContent() {
  // Instead of adding hidden class, use opacity
  const mainContent = document.body;
  if (mainContent) {
    mainContent.classList.add("opacity-0");
    mainContent.classList.add("z-30");
    // Set a maximum time to stay hidden
    setTimeout(() => {
      mainContent.classList.remove("opacity-0");
    }, 3000); // Failsafe timeout
  }
}

async function initializeCoreFunctionality() {
  try {
    // First ensure the DOM is fully loaded
    if (document.readyState !== "complete") {
      await new Promise((resolve) => {
        window.addEventListener("load", resolve);
      });
    }

    // Initialize language before other components
    initializeLanguage();
    loadAtkinsonFont();
    initCharacterDisplay();

    // Initialize components after HTML is definitely loaded
    await fetchAndInjectComponents();

    // Try to initialize language dropdown
    const dropdownInitialized = await initializeLanguageDropdown();
    if (!dropdownInitialized) {
      console.warn(
        "Language dropdown initialization failed, continuing with other components"
      );
    }

    formatNavigationItems();
    // Initialize page numbering
    updatePageNumber();
    await setupTranslations();
    
    return true;
  } catch (error) {
    console.error("Error in core initialization:", error);
    return false;
  }
}

async function updateDropdownTranslations() {
  const dropdown = document.getElementById("language-dropdown");
  if (!dropdown || !state.translations) return;

  Array.from(dropdown.options).forEach((option) => {
    const langName = state.translations[`language-name-${option.value}`];
    if (langName) {
      option.textContent = langName;
    }
  });
}

function initializeLanguage() {
  let languageCookie = getCookie("currentLanguage");
  setState(
    "currentLanguage",
    languageCookie ||
      document.getElementsByTagName("html")[0].getAttribute("lang")
  );
}

const handleResponse = async (response) => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response;
};

async function fetchAndInjectComponents() {
  try {
    const [interfaceHTML, navHTML, configHTML] = await assetLoader.load([
      "./assets/interface.html", 
      "./assets/nav.html", 
      "./assets/config.html"
    ]);
    
    await injectComponents(interfaceHTML, navHTML, configHTML);
  } catch (error) {
    console.error("Error fetching components:", error);
    throw new Error("Failed to fetch components: " + error.message);
  }
};

async function injectComponents(interfaceHTML, navHTML, configHTML) {
  try {
    const cachedInterface = getCachedInterface();
    const cachedNavigation = getCachedNavigation();

    if (cachedInterface && cachedNavigation) {
      const restored = restoreInterfaceElements();
      if (!restored) {
        throw new Error("Failed to restore cached interface elements");
      }
    } else {
      const interfaceContainer = elementCache.get("interface-container");
      const navContainer = elementCache.get("nav-container");

      if (!interfaceContainer || !navContainer) {
        throw new Error("Required containers not found");
      }

      interfaceContainer.innerHTML = interfaceHTML;
      navContainer.innerHTML = navHTML;
      
      // Clear cache since DOM has changed
      elementCache.clear();
      
      cacheInterfaceElements();
    }

    setupConfig(configHTML);
  } catch (error) {
    console.error("Error injecting components:", error);
    throw new Error("Failed to inject components: " + error.message);
  }
}

function setupConfig(configHTML) {
  const parser = new DOMParser();
  const configDoc = parser.parseFromString(configHTML, "text/html");
  const newTitle = configDoc.querySelector("title").textContent;
  const newAvailableLanguages = configDoc
    .querySelector('meta[name="available-languages"]')
    .getAttribute("content");

  updateDocumentMeta(newTitle, newAvailableLanguages);
}

function updateDocumentMeta(newTitle, newAvailableLanguages) {
  if (newTitle !== PLACEHOLDER_TITLE) {
    document.title = newTitle;
  }

  const availableLanguages = document.createElement("meta");
  availableLanguages.name = "available-languages";
  availableLanguages.content = newAvailableLanguages;
  document.head.appendChild(availableLanguages);
}

// Create a helper function for attaching event listeners
function addListener(elementId, event, handler) {
  const element = document.getElementById(elementId);
  if (element) element.addEventListener(event, handler);
  return element;
}

// Use with an object map for clarity
function setupEventListeners() {
  // Handle basic click events
  const clickHandlers = {
    "open-sidebar": toggleSidebar,
    "close-sidebar": toggleSidebar,
    "toggle-eli5": toggleEli5Mode,
    "toggle-easy-read-button": toggleEasyReadMode,
    //"toggle-sign-language": toggleSignLanguageMode,
    //"sl-quick-toggle-button": toggleSignLanguageMode,
    "toggle-syllables": toggleSyllablesMode,
    "toggle-glossary": toggleGlossaryMode,
    "toggle-autoplay": toggleAutoplay,
    "toggle-describe-images": toggleDescribeImages,
    "toggle-state": toggleStateMode,
    "back-button": previousPage,
    "forward-button": nextPage,
    "nav-popup": toggleNav,
    "nav-close": toggleNav,
    "notepad-button": toggleNotepad,
    "close-notepad": toggleNotepad,
    "save-notepad": saveNotes,
  };
  
  // Attach all click handlers
  Object.entries(clickHandlers).forEach(([id, handler]) => {
    const element = elementCache.get(id);
    if (element) element.addEventListener("click", handler);
  });
  
  // Handle special cases
  const languageDropdown = elementCache.get("language-dropdown");
  if (languageDropdown) languageDropdown.addEventListener("change", switchLanguage);
  
  // Set up notepad auto-save
  const notepadTextarea = elementCache.get("notepad-textarea");
  if (notepadTextarea) {
    let saveTimeout;
    notepadTextarea.addEventListener("input", () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveNotes, 1000);
    });
  }
  
  // Global listeners
  document.addEventListener("click", handleNavigation);
  document.addEventListener("keydown", handleKeyboardShortcuts);
  
  // Purple links
  const purpleLinks = elementCache.getAll('.purple-link-button');
  purpleLinks.forEach(link => {
    link.addEventListener('click', () => {
      localStorage.setItem('originatingPage', window.location.href);
    });
  });
  
  setupClickOutsideHandler();
  initializeAudioElements();
}

function setupAudioListeners() {
  // Set up basic controls with a map
  const audioControls = [
    ["play-pause-button", togglePlayPause],
    ["toggle-read-aloud", toggleReadAloud],
    ["audio-previous", playPreviousAudio],
    ["audio-next", playNextAudio],
    ["read-aloud-speed", togglePlayBarSettings]
  ];
  
  audioControls.forEach(([id, handler]) => {
    const element = elementCache.get(id);
    if (element) element.addEventListener("click", handler);
  });

  // Speed buttons
  const speedButtons = elementCache.getAll(".read-aloud-change-speed");
  speedButtons.forEach(button => {
    button.addEventListener("click", changeAudioSpeed);
  });
}

async function initializeUIComponents() {
  try {
    // Group related initializations using async functions
    const initGroups = [
      // Layout and visual components
      async () => {
        await lazyLoad.load('zoom', () => Promise.resolve({ init: initializeZoomController }))
          .then(module => module.init());
        initializeSidebar();
        initializeTabs();
        adjustLayout();
      },
      
      // Feature states - these are independent and can run in parallel
      async () => {
        const stateInitTasks = [
          loadToggleButtonState,
          loadEasyReadMode,
          loadStateMode,
          //loadSignLanguageMode,
          loadAutoplayState,
          loadDescribeImagesState,
          loadGlossaryState
        ];
        
        await Promise.all(stateInitTasks.map(task => Promise.resolve().then(task)));
      },
      
      // Audio and interaction features
      async () => {
        initializePlayBar();
        initializeAudioSpeed();
        setupAudioListeners();
        initializeTtsQuickToggle();
      },
      
      // Content and activity features
      async () => {
        // These can be done in parallel
        const contentTasks = [
          handleEli5Popup,
          initializeGlossary,
          displayCharacterInSettings,
          loadSavedNotes,
          loadNotePad
        ];
        
        await Promise.all(contentTasks.map(task => Promise.resolve().then(task)));
      }
    ];
    
    // Execute all groups in parallel for better performance
    await Promise.all(initGroups.map(group => group()));

    await prepareActivity();
    
    // Check if TTS was enabled - this depends on cookies so do it last
    const readAloudMode = getCookie("readAloudMode") === "true";
    if (readAloudMode) {
      const playBar = elementCache.get("play-bar");
      if (playBar) {
        playBar.classList.remove("hidden");
      }
    }
  } catch (error) {
    console.error('Error initializing UI components:', error);
  }
}

const finalizeInitialization = async () => {
  const navPopup = elementCache.get("navPopup");
  const sidebar = elementCache.get("sidebar");

  setTimeout(async () => {
    // Show navigation and sidebar
    if (navPopup) navPopup.classList.remove("hidden");
    if (sidebar) sidebar.classList.remove("hidden");

    // Initialize autoplay if needed
    if (state.readAloudMode && state.autoplayMode) {
      initializeAutoplay();
    }
    
    // Run these tasks in parallel
    const finalTasks = [
      // Navigation
      () => initializeNavigation(),
      
      // Reference page functionality
      () => initializeReferencePage(),
      
      // Glossary terms
      async () => {
        if (state.glossaryMode) {
          await loadGlossaryTerms();
          highlightGlossaryTerms();
        }
      },
      
      // Math rendering
      () => {
        if (window.MathJax) {
          window.MathJax.typeset();
        }
      },
      
      // Initialize tutorial via lazy loading
      async () => {
        const tutorialModule = await lazyLoad.load('tutorial', () => import('./modules/tutorial.js'));
        if (tutorialModule.init) {
          tutorialModule.init();
        }
      },
      
      // Analytics
      /* async () => {
        const analyticsModule = await lazyLoad.load('analytics', () => import('./modules/analytics.js'));
        analyticsModule.initMatomo({
          siteId: 139,
          trackerUrl: "https://unisitetracker.unicef.io/matomo.php",
          srcUrl: "https://unisitetracker.unicef.io/matomo.js"
        });
      } */
    ];
    
    // Execute all tasks in parallel
    await Promise.all(finalTasks.map(task => Promise.resolve().then(task)));
  }, 100);
};

/**
 * Displays character information in the settings menu
 */
function displayCharacterInSettings() {
  // Get the character information from localStorage
  const characterInfo = localStorage.getItem('characterInfo');
  const studentID = localStorage.getItem('studentID');
  
  if (characterInfo) {
    try {
      const character = JSON.parse(characterInfo);
      const emojiElement = elementCache.get('settings-character-emoji');
      const nameElement = elementCache.get('settings-character-name');
      const studentIDElements = elementCache.getAll('#student-id');
      
      if (emojiElement && nameElement) {
        emojiElement.textContent = character.emoji || '👤';
        nameElement.textContent = character.fullName || localStorage.getItem('nameUser') || 'Guest';
      }
      
      // Update any student ID elements in the settings
      if (studentID && studentIDElements.length > 0) {
        studentIDElements.forEach(element => {
          if (element) element.textContent = studentID;
        });
      }
    } catch (e) {
      console.error('Error parsing character information:', e);
    }
  }
}

// Lazy load module function
const lazyLoad = {
  _modules: {},
  
  async load(name, loader) {
    if (!this._modules[name]) {
      this._modules[name] = await loader();
    }
    return this._modules[name];
  }
};


// Export necessary functions
export {
  changeAudioSpeed,
  handleKeyboardShortcuts,
  initializeAutoplay,
  loadAutoplayState,
  loadDescribeImagesState,
  playNextAudio,
  playPreviousAudio,
  toggleEli5Mode,
  togglePlayPause,
  toggleReadAloud,
};
