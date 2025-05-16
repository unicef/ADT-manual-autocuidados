// audio.js

import { state, setState } from './state.js';
import { getCookie, setCookie } from './cookies.js';
import { updatePlayPauseIcon, deactivateAudioElements, initializeAudioElements } from './ui_utils.js';
import { toggleButtonColor, toggleButtonState } from './utils.js';
import { toggleEasyReadMode, togglePlayBarSettings, toggleSignLanguageMode } from './interface.js';
import { trackToggleEvent } from './analytics.js';

// Constants
const SPEED_MAPPING = {
    'speed-0-5': '0.5',
    'speed-1': '1',
    'speed-1-5': '1.5',
    'speed-2': '2'
};

let hasUserInteracted = true;
let activityAudio = null;
let isProcessingAudio = false;

// Track user interaction
document.addEventListener('click', () => hasUserInteracted = true);
document.addEventListener('keydown', () => hasUserInteracted = true);

/**
 * Initialize activity sound effects
 */
export const initializeActivityAudioElements = () => {
    if (!activityAudio) {
        activityAudio = {
            drop: new Audio('./assets/sounds/drop.mp3'),
            success: new Audio('./assets/sounds/success.mp3'),
            error: new Audio('./assets/sounds/error.mp3'),
            reset: new Audio('./assets/sounds/reset.mp3'),
            validate_success: new Audio('./assets/sounds/validate_success.mp3'),
            //validate_error: new Audio('./assets/sounds/validate_error.mp3'),
            validate_error: new Audio('./assets/sounds/drop.mp3'),
        };

        Object.values(activityAudio).forEach(audio => {
            audio.volume = 0.5;
        });
    }
    return activityAudio;
};

/**
 * Play activity sound effects
 */
export const playActivitySound = async (soundKey) => {
    if (!activityAudio?.[soundKey]) {
        console.log(`Sound ${soundKey} not available`);
        return;
    }

    try {
        activityAudio[soundKey].currentTime = 0;
        await activityAudio[soundKey].play();
    } catch (err) {
        console.log(`Error playing ${soundKey} sound:`, err);
    }
};

/**
 * Gather audio elements from the page
 */
export const gatherAudioElements = () => {
    const elements = Array.from(
        document.querySelectorAll('.container section [data-id], .container section textarea[data-placeholder-id], .container section input[data-placeholder-id]')
      )
        .filter(el => {
          const isNavElement = el.closest('.nav__list') !== null;
          const isImage = el.tagName.toLowerCase() === 'img';
    
          // Exclude images from sequence ONLY if autoplay is on and describe images is off
          /* if (isImage && !state.describeImagesMode) {
            return false;
          } */
    
          // Exclude ELI5 sections
          return !isNavElement && !el.getAttribute('data-id')?.startsWith?.('sectioneli5');
        })
        .map(el => {
          const tagName = el.tagName.toLowerCase();
    
          // If it's an input or textarea with data-placeholder-id, use that instead of data-id
          if ((tagName === 'textarea' || tagName === 'input') && el.hasAttribute('data-placeholder-id')) {
            const placeholderId = el.getAttribute('data-placeholder-id');
            if (placeholderId && state.audioFiles[placeholderId]) {
              return {
                element: el,
                id: placeholderId,
                audioSrc: state.audioFiles[placeholderId]
              };
            }
            return null;
          }
    
          // Default logic for everything else
          const id = el.getAttribute('data-id');
          let audioSrc = state.audioFiles[id];
    
          // If it's an image with a data-aria-id, use that audio instead
          if (tagName === 'img') {
            const ariaId = el.getAttribute('data-aria-id');
            if (ariaId && state.audioFiles[ariaId]) {
              audioSrc = state.audioFiles[ariaId];
            }
          }
    
          // For easyReadMode, check the "easyread-" variant of id
          // but exclude headers and elements in special containers
          if (state.easyReadMode) {
            // Check if element is a header
            const isHeader = el.tagName.toLowerCase().match(/^h[1-6]$/);
            
            // Check if element is inside excluded areas
            const wordCard = el.closest('.word-card');
            const activityItem = el.closest('[data-activity-item]');
            const navList = el.closest('.nav__list');
            const activityText = el.closest('.activity-text');
            const isExcluded = wordCard !== null || activityItem !== null || 
                                navList !== null || activityText !== null;
            
            // Only use easyread audio if not a header and not in excluded areas
            if (!isHeader && !isExcluded) {
              const easyReadAudioId = `easyread-${id}`;
              if (state.audioFiles.hasOwnProperty(easyReadAudioId)) {
                audioSrc = state.audioFiles[easyReadAudioId];
              }
            }
          }
    
          return { element: el, id, audioSrc };
        })
        .filter(item => item && item.audioSrc);
    
      setState('audioElements', elements);
      return elements;
};

export const stopAudio = () => {
    try {
        unhighlightAllElements();
        if (state.currentAudio) {
            state.currentAudio.pause();
            state.currentAudio.currentTime = 0;
            setState('currentAudio', null);
        }
        setState('isPlaying', false);
        updatePlayPauseIcon(false); // Update play button state
        isProcessingAudio = false;
    } catch (error) {
        console.error('Error stopping audio:', error);
    }
};

/**
 * Toggle Play/Pause
 */
export const togglePlayPause = () => {
    if (state.isPlaying) {
        console.log('Pausing audio...');
        stopAudio();
    } else {
        console.log('Resuming audio...');
        setState('isPlaying', true);
        updatePlayPauseIcon(true); // Update play button state
        playAudioSequentially();
    }
};

export const playAudioSequentially = async () => {
    if (isProcessingAudio || !hasUserInteracted) {
        console.log('Audio processing already in progress or waiting for user interaction');
        return;
    }

    isProcessingAudio = true;
    try {
        await processAudioQueue();
    } finally {
        isProcessingAudio = false;
    }
    setState('navigationDirection', 'forward');
};

/**
 * 
 * Plays a single audio file
 */
export const playCurrentAudio = async () => {
    const { currentIndex, audioElements, audioSpeed } = state;

    if (currentIndex < 0 || currentIndex >= audioElements.length) {
        stopAudio();
        return;
    }

    const { element, audioSrc } = audioElements[currentIndex];
    try {
        highlightElement(element);
        await playAudioWithPromise(audioSrc, audioSpeed);
        unhighlightElement(element);
        stopAudio();
    } catch (error) {
        console.error('Error playing audio:', error);
        stopAudio();
    }
};

/**
 * Process audio queue
 */
const processAudioQueue = async () => {
    const { currentIndex, audioElements, audioSpeed, describeImagesMode, navigationDirection } = state;

    if (currentIndex < 0 || currentIndex >= audioElements.length) {
        stopAudio();
        state.currentIndex = 0; // Reset index if out of bounds
        state.navigationDirection = 'forward'; // Reset navigation direction
        console.log('Audio index out of bounds, stopping audio playback.');
        return;
    }

    // Clear leftover highlights first
    unhighlightAllElements(); 

    const { element, audioSrc } = audioElements[currentIndex];
    
    // Check if current element is an image and should be skipped
    const isImage = element.tagName.toLowerCase() === 'img';
    if (isImage && !describeImagesMode) {
        // Skip this audio element and move to the next/previous one based on navigation direction
        if (state.isPlaying) {
            // Determine which direction to navigate based on the last user action
            const direction = navigationDirection === 'backward' ? -1 : 1;
            setState('currentIndex', currentIndex + direction);
            
            // We don't reset navigation direction here yet - we need to keep skipping in the same direction
            // until we find a non-image element
            
            await processAudioQueue();
            return;
        } else {
            stopAudio();
            return;
        }
    }
    
    try {
        highlightElement(element);
        await playAudioWithPromise(audioSrc, audioSpeed);
        unhighlightElement(element);

        if (state.isPlaying) {
            // The key fix: After playing an element, always move forward regardless of how we got here
            if (navigationDirection === 'backward') {
                // We've successfully played the "previous" audio, now reset to forward direction
                setState('navigationDirection', 'forward');
                setState('currentIndex', currentIndex + 1); // Move forward
            } else {
                // Continue in forward direction
                setState('currentIndex', currentIndex + 1);
            }
            await processAudioQueue();
        } else {
            stopAudio();
        }
    } catch (error) {
        console.error('Error playing audio:', error);
        stopAudio();
    }
};

/**
 * Play a single audio file with promise
 */
const playAudioWithPromise = (src, speed) => {
    return new Promise((resolve, reject) => {
        if (!state.isPlaying) {
            resolve();
            return;
        }

        const audio = new Audio(src);
        setState('currentAudio', audio);
        audio.playbackRate = parseFloat(speed);

        audio.onended = resolve;
        audio.onerror = reject;

        updatePlayPauseIcon(true); // Update play button state

        audio.play().catch((error) => {
            console.warn('Audio playback failed:', error);
            resolve();
        });
    });
};

/**
 * UI Element Highlighting
 */
export const highlightElement = (element) => {
    element?.classList.add(
        'outline',
        'outline-blue-300',
        'outline-2',
        'bg-blue-100',
        'bg-opacity-30',
        'text-black',
        'rounded-lg'
    );
};

export const unhighlightElement = (element) => {
    element?.classList.remove(
        'outline',
        'outline-blue-300',
        'bg-opacity-30',
        'outline-2',
        'bg-blue-100',
        'text-black'
    );
    
};

export const unhighlightAllElements = () => {
    document.querySelectorAll('.bg-blue-100').forEach(unhighlightElement);
};

/**
 * Audio Controls
 */

export const playPreviousAudio = () => {
    setState('navigationDirection', 'backward');
    setState('currentIndex', Math.max(0, state.currentIndex - 1));
    stopAudio();
    setState('isPlaying', true);
    playAudioSequentially();
};

export const playNextAudio = () => {
    setState('navigationDirection', 'forward');
    setState('currentIndex', state.currentIndex + 1);
    stopAudio();
    setState('isPlaying', true);
    playAudioSequentially();
};

/**
 * Audio Speed Management
 */
export const initializeAudioSpeed = () => {
    const savedSpeed = getCookie('audioSpeed');
    if (savedSpeed) {
        setState('audioSpeed', savedSpeed);
        updateSpeedDisplay(savedSpeed);
        updateSpeedButtons(savedSpeed);
    }
};

export const changeAudioSpeed = (event) => {
    const button = event.target.closest('.read-aloud-change-speed');
    const speedClass = Array.from(button.classList).find(cls => cls.startsWith('speed-'));
    const newSpeed = SPEED_MAPPING[speedClass];
    
    setState('audioSpeed', newSpeed);
    setCookie('audioSpeed', newSpeed, 7);
    
    updateAudioSpeed(newSpeed);
    updateSpeedDisplay(newSpeed);
    updateSpeedButtons(button);
    togglePlayBarSettings();
};

const updateAudioSpeed = (speed) => {
    if (state.currentAudio) {
        state.currentAudio.playbackRate = parseFloat(speed);
    }
    if (state.eli5Audio) {
        state.eli5Audio.playbackRate = parseFloat(speed);
    }
};

const updateSpeedDisplay = (speed) => {
    const speedClass = Object.entries(SPEED_MAPPING)
        .find(([key, value]) => value === speed)?.[0] || 'speed-1';
    const display = document.querySelector(`[class*="${speedClass}"]`)?.innerHTML;
    if (display) {
        document.getElementById('read-aloud-speed').innerHTML = display;
    }
};

const updateSpeedButtons = (selectedButton) => {
    document.querySelectorAll('.read-aloud-change-speed').forEach(btn => {
        if (btn === selectedButton) {
            btn.classList.add('bg-white', 'text-black');
            btn.classList.remove('bg-black', 'text-white');
        } else {
            btn.classList.remove('bg-white', 'text-black');
            btn.classList.add('bg-black', 'text-white');
        }
    });
};

/**
 * Toggle Read Aloud Mode
 */
export const toggleReadAloud = ({ stopCalls = false } = {}) => {
    stopAudio();
    unhighlightAllElements();
     
    // If turning read aloud off, remove all audio handlers
    if (state.readAloudMode) {
        deactivateAudioElements();
    } else {
        initializeAudioElements();
    }
    
    const newState = !state.readAloudMode;
    setState('readAloudMode', newState);
    setCookie('readAloudMode', newState.toString(), 7);
    toggleButtonColor("tts-quick-toggle-button", newState);

    // Track the toggle event
    trackToggleEvent('ReadAloud', newState);
    
    // Toggle UI elements
    const playBar = document.getElementById("play-bar");
    const ttsOptionsContainer = document.getElementById("tts-options-container");
    const autoplayContainer = document.getElementById("autoplay-container");
    const describeImagesContainer = document.getElementById("describe-images-container");
    const eli5Container = document.querySelector("#eli5-label")?.closest('.flex.justify-between.items-left');
    const ttsQuickToggleButton = document.getElementById("tts-quick-toggle-button");

    if (newState) {
        if (playBar) playBar.classList.remove("hidden");
        if (ttsQuickToggleButton) ttsQuickToggleButton.classList.remove("hidden");
        if (ttsOptionsContainer) {
            ttsOptionsContainer.classList.remove("hidden");
            autoplayContainer?.classList.remove("hidden");
            describeImagesContainer?.classList.remove("hidden");
        }
    } else {
        if (playBar) playBar.classList.add("hidden");
        //if (ttsQuickToggleButton) ttsQuickToggleButton.classList.add("hidden");
        if (ttsOptionsContainer) {
            ttsOptionsContainer.classList.add("hidden");
            autoplayContainer?.classList.add("hidden");
            describeImagesContainer?.classList.add("hidden");
        }
    }

    toggleButtonState("toggle-read-aloud", newState);
    if (!stopCalls && state.signLanguageMode) {
        toggleSignLanguageMode({ stopCalls: true });
    }
    /*if (!stopCalls && state.easyReadMode) {
        toggleEasyReadMode({ stopCalls: true });
    }*/
};

/**
 * Initialize event listener for quick toggle TTS button
 */
export const initializeTtsQuickToggle = () => {
    const ttsQuickToggleButton = document.getElementById("tts-quick-toggle-button");
    
    if (ttsQuickToggleButton) {
        // Initially hide the button if read aloud is off
        if (!state.readAloudMode) {
            //ttsQuickToggleButton.classList.add("hidden");
        }
        
        // Add click event listener
        ttsQuickToggleButton.addEventListener("click", (e) => {
            e.preventDefault();
            
            // Toggle read aloud mode
            toggleReadAloud();
            
            // Provide visual feedback for the button press
            ttsQuickToggleButton.classList.add("bg-blue-200");
            setTimeout(() => {
                ttsQuickToggleButton.classList.remove("bg-blue-200");
            }, 300);
        });
    }
};