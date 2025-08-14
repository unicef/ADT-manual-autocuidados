/**
 * @module translations
 * @description
 * Handles loading, applying, and managing translations for the UI, including language switching, placeholders, ELI5, and glossary integration.
 */
import { state, setState } from './state.js';
import { unhighlightAllElements } from './ui_utils.js';
import { gatherAudioElements } from './audio.js';
import { showErrorToast } from './error_utils.js';
import { highlightGlossaryTerms, removeGlossaryHighlights, loadGlossaryTerms } from './interface.js';
import { loadCurrentSLVideo } from './video.js';
import { announceToScreenReader } from './ui_utils.js';
import { isFeatureEnabled } from '../base.js';

/**
 * Set up translations and audio files for the application.
 * Ensures a language is set, fetches translations, and shows main content.
 * @returns {Promise<boolean>} Resolves true if successful, false otherwise.
 */
export const setupTranslations = async () => {
   try {
       if (!state.currentLanguage) {
           console.warn('No language set, using default');
           setState('currentLanguage', 'en');
       }
       
       await fetchTranslations();
       //gatherAudioElements();
       return true;
   } catch (error) {
       console.error('Error setting up translations:', error);
       showErrorToast('Error loading translations. Using defaults.');
       return false;
   } finally {
       // Always ensure content is shown
       showMainContent();
   }
};

/**
 * Safe JSON parsing with error handling.
 * @param {Response} response - The fetch response object.
 * @param {string} errorContext - Context for error reporting.
 * @returns {Promise<Object>} Parsed JSON object.
 * @throws {Error} If parsing fails.
 * @private
 */
const safeJsonParse = async (response, errorContext) => {
    try {
        const text = await response.text();
        return JSON.parse(text);
    } catch (error) {
        console.error(`JSON parse error in ${errorContext}:`, error);
        throw new Error(`Invalid JSON in ${errorContext}: ${error.message}`);
    }
};

/**
 * Fetch translations from server and apply them.
 * Loads interface and language-specific translations, merges them, and updates state.
 * Also applies translations to the DOM and updates audio/video files.
 * @returns {Promise<void>}
 */
export const fetchTranslations = async () => {
    try {        
        const currentLang = state.currentLanguage || 'en';
        // Fetch interface translations with proper error handling
        const interfacePath = `./assets/interface_translations/${currentLang}/interface_translations.json`;
        const interface_response = await fetch(interfacePath);
        if (!interface_response.ok) {
            console.warn('Interface translations not found, using defaults');
            setState('translations', {});
            return;
        }
        const interface_data = await safeJsonParse(interface_response, 'interface translations');

        // Fetch content files (texts, audios, videos) from the language-specific path
        await fetchContentFiles(`./content/i18n/${currentLang}`);
        
        // Merge translations if interface data exists for current language
        if (interface_data) {
            setState('translations', {
                ...state.translations,
                ...interface_data,
            });
            
            updateLanguageDropdownFromAppConfig();
        }
        
        // Apply translations before showing content
        await applyTranslations();
        
    } catch (error) {
        console.error('Error loading translations:', error);
        // Set default translations if everything fails
        setState('translations', {});
        setState('audioFiles', {});
        throw error;
    } finally {
        if (window.MathJax) {
            window.MathJax.typeset();
        }
    }
};

/**
 * Apply translations to the DOM.
 * Handles easy-read mode, glossary highlights, and updates audio/video.
 * @returns {Promise<void>}
 */
export const applyTranslations = async () => {
    console.log(`=== APPLY TRANSLATIONS START - easyReadMode: ${state.easyReadMode} ===`);
    unhighlightAllElements();

    const translations = state.translations;
    if (!translations) return;

    for (const [key, value] of Object.entries(translations)) {
        if (key.startsWith("sectioneli5")) continue;

        let translationKey = key;

        if (state.easyReadMode) {
            // Only debug problematic TOC items that aren't getting easy-read translations
            const problemKeys = ['text-6-0', 'text-6-2', 'text-6-6', 'text-6-8'];
            
            const elements = document.querySelectorAll(`[data-id="${key}"]`);
            const isHeader = Array.from(elements).some(element => 
                element.tagName.toLowerCase().match(/^h[1-6]$/) ||
                element.closest('h1, h2, h3, h4, h5, h6') !== null
            );
            
            // Check if element is inside a word card, data-activity-item, nav list, or activity-text
            // But make exceptions for table of contents sections
            const isExcluded = Array.from(elements).some(element => {
                // Check if we're in a table of contents section
                const isInTableOfContents = element.closest('[data-section-type="table_of_contents"]');
                
                if (problemKeys.includes(key)) {
                    console.log(`🔍 DEBUGGING ${key}: isInTableOfContents=${!!isInTableOfContents}`);
                }
                
                // If we're in a table of contents, don't exclude any elements
                if (isInTableOfContents) {
                    return false;
                }
                
                const wordCard = element.closest('.word-card');
                const activityItem = element.closest('[data-activity-item]');
                // Only exclude if it's specifically a navigation menu, not a general list
                const navList = element.closest('.nav__list, nav ul, .navigation');
                const activityText = element.closest('.activity-text');
                
                if (problemKeys.includes(key)) {
                    console.log(`🔍 DEBUGGING ${key}: wordCard=${!!wordCard}, activityItem=${!!activityItem}, navList=${!!navList}, activityText=${!!activityText}`);
                }
                
                return wordCard !== null || activityItem !== null || navList !== null || activityText !== null;
            });
            
            if (problemKeys.includes(key)) {
                console.log(`🔍 DEBUGGING ${key}: isHeader=${isHeader}, isExcluded=${isExcluded}`);
            }
            
            // Skip applying easy-read translation if it's a header or inside excluded areas
            if (!isHeader && !isExcluded) {
                const easyReadKey = `easyread-${key}`;
                if (translations.hasOwnProperty(easyReadKey)) {
                    if (problemKeys.includes(key)) {
                        console.log(`✅ ${key}: Using easy-read translation: ${easyReadKey}`);
                    }
                    translationKey = easyReadKey;
                } else {
                    if (problemKeys.includes(key)) {
                        console.log(`❌ ${key}: No easy-read translation found for: ${easyReadKey}`);
                    }
                }
            } else {
                if (problemKeys.includes(key)) {
                    console.log(`❌ ${key}: Skipped easy-read - isHeader=${isHeader}, isExcluded=${isExcluded}`);
                }
            }
        }

        applyTranslationToElements(key, translationKey);
        applyTranslationToPlaceholders(key, translationKey);
        
    }
    // Adding to gather the correct audio elements
    gatherAudioElements();
    loadCurrentSLVideo();
    handleEli5Translation();
    
    // Re-apply glossary highlighting if it's active
    // This ensures highlights are maintained when easy-read mode changes
    if (isFeatureEnabled('glossary') && state.glossaryMode && typeof highlightGlossaryTerms === 'function') {
        // First remove existing highlights
        if (typeof removeGlossaryHighlights === 'function') {
            removeGlossaryHighlights();
        }
        
        // If we need to reload terms based on language, do that first
        if (typeof loadGlossaryTerms === 'function') {
            loadGlossaryTerms().then(() => {
                highlightGlossaryTerms();
            });
        } else {
            // Otherwise just reapply highlighting
            highlightGlossaryTerms();
        }
    }

    // Change the title of the page
    const titleMeta = document.querySelector('meta[name="title-id"]');
    if (titleMeta) {
        const titleId = titleMeta.getAttribute('content');
        if (titleId && state.translations[titleId]) {
            document.title = state.translations[titleId];
        }
    }
};

/**
 * Apply translation to elements with data-id attribute.
 * Handles text, images, and easy-read mode styling.
 * @param {string} key - The translation key.
 * @param {string} translationKey - The key to use for translation lookup.
 * @private
 */
const applyTranslationToElements = (key, translationKey) => {
    const elements = document.querySelectorAll(`[data-id="${key}"]`);
    elements.forEach((element) => {
        if (element) {
            if (element.tagName === "IMG") {
                element.setAttribute("alt", state.translations[translationKey]);
            } else {
                // Convert newline characters to HTML line breaks
                const translatedText = state.translations[translationKey].replace(/\n/g, '<br>');
                
                // Check if this is easy-read content
                const isEasyRead = translationKey.startsWith('easyread-');
                
                // Check if the element is a header or inside a header
                const isHeader = element.tagName.toLowerCase().match(/^h[1-6]$/) ||
                                element.closest('h1, h2, h3, h4, h5, h6') !== null;
                
                // Only modify text size classes for non-header elements
                if (!isHeader) {
                   
                    // Simple approach: always remove and re-add text size classes
                    element.classList.remove('text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl');
                    
                    // Handle parent elements that might have text size classes
                    const parent = element.parentElement;
                    if (parent) {
                        // Remove all possible text size classes from parent
                        parent.classList.remove('text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl');
                        
                        // Add appropriate size to parent
                        if (isEasyRead) {
                            parent.classList.add('text-2xl');
                        } else {
                            parent.classList.add('text-xl'); // Default parent size for table of contents
                        }
                    }
                    
                    // Add appropriate text size class to the element itself
                    if (isEasyRead) {
                        element.classList.add('text-2xl');
                    } else {
                        element.classList.add('text-lg'); // Default element size
                    }
                }
                
                // Set the content with proper line breaks
                element.innerHTML = translatedText;
            }
        }
    });
};

/**
 * Apply translation to placeholder attributes.
 * @param {string} key - The translation key.
 * @param {string} translationKey - The key to use for translation lookup.
 * @private
 */
const applyTranslationToPlaceholders = (key, translationKey) => {
    const placeholderElements = document.querySelectorAll(
        `[data-placeholder-id="${key}"]`
    );
    placeholderElements.forEach((element) => {
        if (element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA")) {
            element.setAttribute("placeholder", state.translations[translationKey]);
        }
    });
};

/**
 * Handle ELI5 (Explain Like I'm 5) translations.
 * Updates the ELI5 content area if ELI5 mode is active.
 * @private
 */
const handleEli5Translation = () => {
    if (state.eli5Mode) {
        const mainSection = document.querySelector(
            'section[data-id^="sectioneli5"]'
        );
        if (mainSection) {
            const eli5Id = mainSection.getAttribute("data-id");
            const eli5Text = state.translations[eli5Id];

            if (eli5Text) {
                const eli5Container = document.getElementById("eli5-content-text");
                if (eli5Container) {
                    eli5Container.innerHTML = eli5Text;
                }
            }
        }
    }
};

/**
 * Update language dropdown with available languages.
 * Sets the visible language names in the dropdown.
 * @param {Object} interface_data - The interface translations object.
 * @private
 */
/* const updateLanguageDropdown = (interface_data) => {
    const dropdown = document.getElementById("language-dropdown");
    if (!dropdown) return;

    const options = Array.from(dropdown.options);
    options.forEach((option) => {
        const languageData = interface_data[option.value];
        if (languageData && languageData["language-name"]) {
            option.textContent = languageData["language-name"];
        }
    });
}; */

/**
 * Update language dropdown using languages from window.appConfig.
 * Fetches each language's interface_translations.json to get the language name.
 * @returns {Promise<void>}
 */
export const updateLanguageDropdownFromAppConfig = async () => {
    const dropdown = document.getElementById("language-dropdown");
    if (!dropdown || !window.appConfig || !window.appConfig.languages || !Array.isArray(window.appConfig.languages.available)) return;

    // Clear existing options
    dropdown.innerHTML = '';

    for (const lang of window.appConfig.languages.available) {
        try {
            const response = await fetch(`./assets/interface_translations/${lang}/interface_translations.json`);
            if (!response.ok) continue;
            const interfaceData = await response.json();
            // Try to get the language name from the loaded data
            const languageName = interfaceData?.['language-name'] || lang;

            const option = document.createElement('option');
            option.value = lang;
            option.textContent = languageName;
            // Select the option if it matches the current language
            if (lang === state.currentLanguage) {
                option.selected = true;
            }
            dropdown.appendChild(option);
        } catch (err) {
            // If fetch fails, skip this language
            console.warn(`Could not load interface translations for ${lang}`);
        }
    }
};

/**
 * Show main content of the application.
 * Removes hiding classes and applies transition for visibility.
 * @private
 */
const showMainContent = () => {
    const mainContent = document.querySelector('body > .container');
    if (mainContent) {
        mainContent.classList.remove('opacity-0', 'invisible');
        mainContent.classList.add('opacity-100', 'visible', 'transition-opacity', 'duration-300', 'ease-in-out');
    }
};

/**
 * Translate a specific text key with optional variables.
 * @param {string} textToTranslate - The translation key.
 * @param {Object} [variables={}] - Variables to interpolate in the translation.
 * @returns {string} The translated string with variables replaced, or the key if not found.
 */
export const translateText = (textToTranslate, variables = {}) => {
    if (!state.translations || !state.translations[textToTranslate]) {
        return textToTranslate;
    }

    return state.translations[textToTranslate].replace(/\${(.*?)}/g, (match, p1) => 
        variables[p1] ?? ""
    );
};

export const cycleLanguage = () => {
  // Get available languages from the dropdown
  const languageDropdown = document.getElementById('language-dropdown');
  if (!languageDropdown) {
    console.error("Language dropdown not found");
    return;
  }
  
  // Get the current language and all available options
  const currentLanguage = languageDropdown.value;
  const options = Array.from(languageDropdown.options);
  const currentIndex = options.findIndex(option => option.value === currentLanguage);
  
  // Find the next language
  const nextIndex = (currentIndex + 1) % options.length;
  const nextLanguage = options[nextIndex].value;
  
  console.log(`Cycling language from ${currentLanguage} to ${nextLanguage}`);
  
  // Update the dropdown value
  languageDropdown.value = nextLanguage;
  
  // Trigger the change event to activate language switch
  const changeEvent = new Event('change');
  languageDropdown.dispatchEvent(changeEvent);
  
  // Announce language change to screen readers
  // Get the language name for announcement
  const langName = options[nextIndex].text;
  announceToScreenReader(
    translateText("language-changed-to", { language: langName })
 );
};

/**
 * Fetch and load texts, audios, and videos JSON files from a given path.
 * Updates the respective state properties: translations, audioFiles, and videoFiles.
 * @param {string} basePath - The base path where the JSON files are located
 * @returns {Promise<void>}
 */
export const fetchContentFiles = async (basePath) => {
    try {
        // Fetch all three files in parallel
        const [textsResponse, audiosResponse, videosResponse] = await Promise.allSettled([
            fetch(`${basePath}/texts.json`),
            fetch(`${basePath}/audios.json`),
            fetch(`${basePath}/videos.json`)
        ]);

        // Process texts.json
        if (textsResponse.status === 'fulfilled' && textsResponse.value.ok) {
            const textsData = await safeJsonParse(textsResponse.value, 'texts.json');
            setState('translations', { ...state.translations, ...textsData });
        } else {
            console.warn(`Could not load texts.json from ${basePath}`);
        }

        // Process audios.json
        if (audiosResponse.status === 'fulfilled' && audiosResponse.value.ok) {
            const audiosData = await safeJsonParse(audiosResponse.value, 'audios.json');
            setState('audioFiles', { ...state.audioFiles, ...audiosData });
        } else {
            console.warn(`Could not load audios.json from ${basePath}`);
        }

        // Process videos.json
        if (videosResponse.status === 'fulfilled' && videosResponse.value.ok) {
            const videosData = await safeJsonParse(videosResponse.value, 'videos.json');
            setState('videoFiles', { ...state.videoFiles, ...videosData });
        } else {
            console.warn(`Could not load videos.json from ${basePath}`);
        }

    } catch (error) {
        console.error('Error fetching content files:', error);
    }
};