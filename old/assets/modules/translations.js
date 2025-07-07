import { state, setState } from './state.js';
import { unhighlightAllElements } from './audio.js';
import { gatherAudioElements } from './audio.js';
import { showErrorToast } from './error_utils.js';
import { highlightGlossaryTerms, removeGlossaryHighlights, loadGlossaryTerms } from './interface.js';
import { loadCurrentSLVideo } from './video.js';

/**
 * Set up translations and audio files for the application
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
 * Safe JSON parsing with error handling
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
 * Fetch translations from server and apply them
 */
export const fetchTranslations = async () => {
    try {
        // Fetch interface translations with proper error handling
        const interface_response = await fetch('./assets/interface_translations.json');
        if (!interface_response.ok) {
            console.warn('Interface translations not found, using defaults');
            setState('translations', {});
            return;
        }
        const interface_data = await safeJsonParse(interface_response, 'interface translations');

        // Fetch language-specific translations
        const currentLang = state.currentLanguage || 'en';
        const langPath = `./translations_${currentLang}.json`;
        console.log('Fetching translations from:', langPath);
        
        const response = await fetch(langPath);
        if (!response.ok) {
            console.warn(`Language translations for ${currentLang} not found, using defaults`);
            setState('translations', interface_data[currentLang] || {});
            return;
        }
        
        const data = await safeJsonParse(response, 'language translations');
        
        // Merge translations if interface data exists for current language
        if (interface_data[currentLang]) {
            setState('translations', {
                ...data.texts,
                ...interface_data[currentLang],
            });
            
            updateLanguageDropdown(interface_data);
        } else {
            setState('translations', data.texts || {});
        }
        
        setState('audioFiles', data.audioFiles || {});
        setState('videoFiles', data.videoFiles || {});
        
        // Apply translations before showing content
        await applyTranslations();

        // Add to your fetchTranslations function, after applying translations
        // if (glossaryMode) {
        //   loadGlossaryTerms().then(() => {
        //     removeGlossaryHighlights(); // Clean up existing highlights
        //     highlightGlossaryTerms(); // Reapply with new language
        //   });
        // };
        
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
 * Apply translations to the DOM
 */
export const applyTranslations = async () => {
    unhighlightAllElements();

    const translations = state.translations;
    if (!translations) return;

    for (const [key, value] of Object.entries(translations)) {
        if (key.startsWith("sectioneli5")) continue;

        let translationKey = key;

        if (state.easyReadMode) {
            const elements = document.querySelectorAll(`[data-id="${key}"]`);
            const isHeader = Array.from(elements).some(element => 
                element.tagName.toLowerCase().match(/^h[1-6]$/)
            );
            
            // Check if element is inside a word card, data-activity-item, nav list, or activity-text
            const isExcluded = Array.from(elements).some(element => {
                const wordCard = element.closest('.word-card');
                const activityItem = element.closest('[data-activity-item]');
                const navList = element.closest('.nav__list');
                const activityText = element.closest('.activity-text');
                return wordCard !== null || activityItem !== null || navList !== null || activityText !== null;
            });
            
            // Skip applying easy-read translation if it's a header or inside excluded areas
            if (!isHeader && !isExcluded) {
                const easyReadKey = `easyread-${key}`;
                if (translations.hasOwnProperty(easyReadKey)) {
                translationKey = easyReadKey;
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
    if (state.glossaryMode && typeof highlightGlossaryTerms === 'function') {
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
};

/**
 * Apply translation to elements with data-id attribute
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
                
                // Check if the element is a header
                const isHeader = element.tagName.toLowerCase().match(/^h[1-6]$/);
                
                // Only modify text size classes for non-header elements
                if (!isHeader) {
                    // Remove text size class only for non-headers
                    element.classList.remove('text-2xl');
                    
                    // Add text-2xl class for non-header elements in easy-read mode
                    if (isEasyRead) {
                        element.classList.add('text-2xl');
                    }
                }
                
                // Set the content with proper line breaks
                element.innerHTML = translatedText;
            }
        }
    });
};

/**
 * Apply translation to placeholder attributes
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
 * Handle ELI5 (Explain Like I'm 5) translations
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
 * Update language dropdown with available languages
 */
const updateLanguageDropdown = (interface_data) => {
    const dropdown = document.getElementById("language-dropdown");
    if (!dropdown) return;

    const options = Array.from(dropdown.options);
    options.forEach((option) => {
        const languageData = interface_data[option.value];
        if (languageData && languageData["language-name"]) {
            option.textContent = languageData["language-name"];
        }
    });
};

/**
 * Show main content of the application
 */
const showMainContent = () => {
    const mainContent = document.querySelector('body > .container');
    if (mainContent) {
        mainContent.classList.remove('opacity-0', 'invisible');
        mainContent.classList.add('opacity-100', 'visible', 'transition-opacity', 'duration-300', 'ease-in-out');
    }
};

/**
 * Translate a specific text key with optional variables
 */
export const translateText = (textToTranslate, variables = {}) => {
    if (!state.translations || !state.translations[textToTranslate]) {
        return textToTranslate;
    }

    return state.translations[textToTranslate].replace(/\${(.*?)}/g, (match, p1) => 
        variables[p1] ?? ""
    );
};