// Initial state with default values - all toggles off by default
const initialState = {
    currentAudio: null,
    isPlaying: false,
    currentIndex: 0,
    audioElements: [],
    audioQueue: [],
    eli5Active: false,
    eli5Element: null,
    eli5Audio: null,
    eli5Mode: false,
    readAloudMode: false,
    signLanguageMode: false,
    sideBarActive: false,
    navOpen: false,
    navScrollPosition: 0,
    easyReadMode: false,
    autoplayMode: false,
    describeImagesMode: false,
    syllablesMode: false,
    glossaryMode: false,
    audioSpeed: 1,
    selectedOption: null,
    selectedWord: null,
    inCategoryNavigation: false,
    currentWord: null,
    translations: {},
    audioFiles: {},
    validateHandler: null,
    retryHandler: null,
    currentLanguage: document.documentElement.lang || 'en',
    currentPage: "",
    interfaceInitialized: false,
    activeTabIndex: 0,
    glossaryListOpen: false,
    isReferencePage: false,
    originatingPage: null,
    stateMode: true,
    videoFiles: {},
    videoPlaying: false,
    videoElement: null,
    videoSource: "",
    characterName: null,
    characterGreeting: null,
    notepadOpen: false,
    navigationDirection: 'forward'
};

// State management
export const state = { ...initialState };

export const getState = (key) => state[key];

export const setState = (key, value) => {
    if (!(key in state)) {
        console.warn(`Creating new state key: ${key}`);
    }
    state[key] = value;
    return state[key];
};

// For handling multiple state updates
export const updateState = (updates) => {
    Object.entries(updates).forEach(([key, value]) => {
        state[key] = value;
    });
};

export const resetState = () => {
    Object.assign(state, initialState);
};

export const getFullState = () => ({ ...state });

// Initialize state from cookies with default false for toggles
export const initializeStateFromCookies = () => {
    const cookieKeys = {
        readAloudMode: false,
        easyReadMode: false,
        eli5Mode: false,
        autoplayMode: false,
        describeImagesMode: false,
        syllablesMode: false,
        audioSpeed: 1,
        currentLanguage: document.documentElement.lang || 'en'
    };

    Object.entries(cookieKeys).forEach(([stateKey, defaultValue]) => {
        const cookieValue = getCookie(stateKey);
        if (cookieValue !== null) {
            if (stateKey === 'audioSpeed') {
                setState(stateKey, parseFloat(cookieValue) || 1);
            } else if (typeof defaultValue === 'boolean') {
                setState(stateKey, cookieValue === 'true');
            } else {
                setState(stateKey, cookieValue || defaultValue);
            }
        } else {
            setState(stateKey, defaultValue);
        }
    });
};