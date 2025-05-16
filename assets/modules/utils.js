import { state } from './state.js';
import { setCookie } from './cookies.js';
import { translateText } from './translations.js';
import { nextPage } from './navigation.js';
import { stopAudio, unhighlightAllElements, playActivitySound } from './audio.js';
import { trackActivityCompletion } from './analytics.js';
import { updateResetButtonVisibility } from '../activity.js';

export const ActivityTypes = Object.freeze({
    MULTIPLE_CHOICE: "activity_multiple_choice",
    FILL_IN_THE_BLANK: "activity_fill_in_the_blank",
    SORTING: "activity_sorting",
    OPEN_ENDED_ANSWER: "activity_open_ended_answer",
    MATCHING: "activity_matching",
    TRUE_FALSE: "activity_true_false",
    FILL_IN_A_TABLE: "activity_fill_in_a_table",
});

window.utils = {
    provideFeedback: null
}

export const toggleButtonState = (buttonId, toState = null) => {
    const button = document.getElementById(buttonId);
    if (button) {
        const isChecked = button.getAttribute('aria-checked') === 'true';
        const newState = toState !== null ? toState : !isChecked;

        button.setAttribute('aria-checked', newState);
        button.querySelector('#toggle-dot').classList.toggle('translate-x-5', newState);
        button.querySelector('#toggle-background').classList.toggle('bg-gray-400', !newState);
        button.querySelector('#toggle-background').classList.toggle('bg-blue-700', newState);
    } else {
        console.error(`No element found with ID: ${buttonId}`);
    }
};


export const toggleButtonColor = (buttonId, newState) => {
    const button = document.getElementById(buttonId);
    if (button) {
        const icon = button.querySelector('svg');

        // Toggle button classes
        button.classList.toggle('bg-gray-200', !newState);
        button.classList.toggle('hover:bg-gray-300', !newState);
        button.classList.toggle('bg-blue-50', newState);
        button.classList.toggle('hover:bg-gray-100', newState);
        button.classList.toggle('focus:ring-blue-500', newState);

        // Toggle icon classes
        if (icon) {
            icon.classList.toggle('text-gray-600', !newState);
            icon.classList.toggle('text-blue-600', newState);
        }
    } else {
        console.error(`No button found with ID: ${buttonId}`);
    }
};

export const updateSubmitButtonAndToast = (
    isCorrect,
    buttonText = translateText("next-activity"),
    activityType,
    unfilledCount = 0,
    options = {}
) => {
    const submitButton = document.getElementById("submit-button");
    const resetButton = document.getElementById("reset-button");
    const toast = document.getElementById("toast");
    
    // Default options
    const defaultOptions = {
        message: '', // Custom message to override default
        emoji: '', // Custom emoji to override default
        toastType: '', // Can be 'success', 'error', 'warning', 'info'
        timeout: 6000, // Time in milliseconds before hiding toast
        showCloseButton: true // Whether to show the close button
    };
    
    // Merge defaults with provided options
    const mergedOptions = {...defaultOptions, ...options};

    // Remove previous event listeners
    checkCurrentActivityCompletion(isCorrect);
    submitButton.removeEventListener("click", state.validateHandler);
    submitButton.removeEventListener("click", state.retryHandler);
    submitButton.removeEventListener("click", nextPage);

    updateResetButtonVisibility();

    // Control reset button visibility based on activity type
    if (resetButton) {
        // Only show reset button for activities where it makes sense
        if (activityType === ActivityTypes.OPEN_ENDED_ANSWER || 
            activityType === ActivityTypes.FILL_IN_THE_BLANK || 
            activityType === ActivityTypes.SORTING ||
            activityType === ActivityTypes.FILL_IN_A_TABLE ||
            activityType === ActivityTypes.MATCHING) {
            resetButton.classList.remove("hidden");
        } else {
            resetButton.classList.add("hidden");
        }
    }

    if (isCorrect) {
        // Track successful activity completion
        const activityId = location.pathname
            .substring(location.pathname.lastIndexOf("/") + 1)
            .split(".")[0];
            
        trackActivityCompletion(activityId, activityType);
        
        submitButton.textContent = buttonText;
        
        if (toast) {
            // Determine message and emoji based on options or defaults
            const message = mergedOptions.message || 
                           ((activityType === ActivityTypes.OPEN_ENDED_ANSWER || 
                             activityType === ActivityTypes.FILL_IN_A_TABLE) 
                             ? translateText("answers-submitted")
                             : translateText("correct-answer"));
            
            const emoji = mergedOptions.emoji || '🎉';
            const toastType = mergedOptions.toastType || 'success';
            
            // Display toast with success styling
            setupToast(
                toast, 
                toastType, 
                emoji, 
                message, 
                mergedOptions.showCloseButton
            );
        }

        if (buttonText === translateText("next-activity")) {
            submitButton.addEventListener("click", nextPage);
            submitButton.setAttribute("aria-label", translateText("next-activity"));

            const activityId = location.pathname
                .substring(location.pathname.lastIndexOf("/") + 1)
                .split(".")[0];
            localStorage.setItem(`${activityId}_success`, "true");
        }

        // Set timeout to hide toast
        setTimeout(() => {
            toast?.classList.add("hidden");
        }, mergedOptions.timeout || 6000);
    } else {
        // Handle incorrect submission with enhanced options
        handleIncorrectSubmission(
            submitButton, 
            toast, 
            activityType, 
            unfilledCount, 
            mergedOptions
        );
    }
};

export const checkCurrentActivityCompletion = (isCorrect) => {
    const activityId = location.pathname.substring(location.pathname.lastIndexOf("/") + 1).split(".")[0];
    const currentActivityIcon = document.querySelector(`[class*="${activityId}"]`);
    
    // Add null check before accessing classList
    if (!currentActivityIcon) {
        console.warn(`Activity icon not found for ID: ${activityId}`);
        return;
    }
    
    if (isCorrect) {
      currentActivityIcon.classList.replace("fa-pen-to-square", "fa-square-check");
      currentActivityIcon.classList.replace("text-blue-700", "text-green-500");
    } else {
      currentActivityIcon.classList.replace("fa-square-check", "fa-pen-to-square");
      currentActivityIcon.classList.replace("text-green-500", "text-blue-700");
    }
}

const handleIncorrectSubmission = (submitButton, toast, activityType, unfilledCount, options = {}) => {
    if (activityType === ActivityTypes.MULTIPLE_CHOICE) {
        submitButton.textContent = translateText("retry");
        submitButton.setAttribute("aria-label", translateText("retry"));
        state.retryHandler = retryActivity;
        submitButton.addEventListener("click", state.retryHandler);
    } else {
        submitButton.textContent = translateText("submit-text");
        submitButton.setAttribute("aria-label", translateText("submit-text"));
        // Make sure we're adding the current validateHandler
        if (state.validateHandler) {
            submitButton.addEventListener("click", state.validateHandler);
        }
    }

    updateToastForIncorrectSubmission(toast, activityType, unfilledCount, options);
};

const updateToastForIncorrectSubmission = (toast, activityType, unfilledCount, options = {}) => {
    if (!toast) return;

    // Use provided options or determine defaults based on activity
    let message = options.message;
    let emoji = options.emoji;
    let toastType = options.toastType;
    
    // If no specific options provided, determine based on activity and completion
    if (!message || !emoji || !toastType) {
        if (activityType === ActivityTypes.OPEN_ENDED_ANSWER ||
            activityType === ActivityTypes.FILL_IN_THE_BLANK ||
            activityType === ActivityTypes.FILL_IN_A_TABLE) {
            
            if (unfilledCount > 0) {
                // Warning for incomplete fields
                message = message || translateText("fill-in-the-blank-not-complete", {
                    unfilledCount: unfilledCount,
                });
                emoji = emoji || '⚠️';
                toastType = toastType || 'warning';
            } else {
                // Error for incorrect answers
                let defaultMessage;
                switch (activityType) {
                    case ActivityTypes.FILL_IN_A_TABLE:
                    case ActivityTypes.FILL_IN_THE_BLANK:
                    default:
                        defaultMessage = translateText("fill-in-the-blank-try-again");
                }
                message = message || defaultMessage;
                emoji = emoji || '🤔';
                toastType = toastType || 'error';
            }
        } else {
            // Default for other activity types
            message = message || translateText("fill-in-the-blank-try-again");
            emoji = emoji || '🤔';
            toastType = toastType || 'error';
        }
    }
    
    // Display the toast with determined values
    setupToast(
        toast, 
        toastType, 
        emoji, 
        message, 
        options.showCloseButton !== false
    );

    // Set timeout for hiding toast
    setTimeout(() => {
        toast?.classList.add("hidden");
    }, options.timeout || 6000);
};

export const provideFeedback = (element, isCorrect, correctAnswer, activityType) => {
    let feedback = document.createElement("span");
    feedback.classList.add(
        "feedback",
        "ml-2",
        "px-2",
        "py-1",
        "rounded-full",
        "text-lg",
        "w-32",
        "text-center"
    );
    feedback.setAttribute("role", "alert");

    const dataActivityItem = element.getAttribute("data-activity-item");
    if (dataActivityItem) {
        feedback.setAttribute("aria-labelledby", dataActivityItem);
    }

    window.utils.provideFeedback = provideFeedback;

    handleFeedbackPlacement(element, feedback, activityType);
    updateFeedbackContent(feedback, isCorrect, activityType, element);

    // Set ARIA attributes
    feedback.id = `feedback-${dataActivityItem}`;
    element.setAttribute("aria-describedby", feedback.id);
};

const handleFeedbackPlacement = (element, feedback, activityType) => {
    /*if (activityType === ActivityTypes.FILL_IN_THE_BLANK) {
        element.parentNode.appendChild(feedback);
    } else if (activityType === ActivityTypes.MULTIPLE_CHOICE) {
        const feedbackContainer = document.querySelector(".questions");
        feedbackContainer?.appendChild(feedback);
    }*/
};

const updateFeedbackContent = (feedback, isCorrect, activityType, element) => {
    feedback.innerText = "";
    feedback.classList.remove(
        "bg-green-200",
        "text-green-700",
        "bg-red-200",
        "text-red-700"
    );

    if (activityType === ActivityTypes.FILL_IN_THE_BLANK ||
        activityType === ActivityTypes.OPEN_ENDED_ANSWER ||
        activityType === ActivityTypes.FILL_IN_A_TABLE) {
        
        handleTextInputFeedback(feedback, isCorrect, element);
    } else if (activityType === ActivityTypes.MULTIPLE_CHOICE) {
        handleMultipleChoiceFeedback(feedback, isCorrect, element);
    }
};

const handleTextInputFeedback = (feedback, isCorrect, element) => {
    // Remove the feedback span as we'll place the icon directly in the element
    feedback.remove();

    // Get a reliable identifier for this element (prefer data-aria-id over id)
    const elementId = element.getAttribute('data-activity-item') || element.getAttribute('data-aria-id') || element.id || `input-${Math.random().toString(36).substr(2, 9)}`;

    // Remove any existing feedback icons related to this element
    const existingIcons = document.querySelectorAll(`.feedback-icon-for-${element.getAttribute('data-activity-item')}`);
    existingIcons.forEach(icon => icon.remove());
    
    // Ensure element has padding to accommodate the icon
    element.style.paddingRight = '30px';
    
    // Create an icon element
    const iconElement = document.createElement("div");
    iconElement.className = `feedback-icon-for-${elementId}`;
    
    // Position the icon absolutely within the input's coordinate space
    iconElement.style.position = "absolute";
    iconElement.style.pointerEvents = "none";
    iconElement.style.zIndex = "10";
    
    // Add the Font Awesome icon
    const icon = document.createElement("i");
    icon.className = isCorrect ? 
        "fas fa-check-circle text-green-600 feedback-icon" : 
        "fas fa-times-circle text-red-600 feedback-icon";
    icon.setAttribute("aria-hidden", "true");
    
    iconElement.appendChild(icon);
    
    // Add appropriate ARIA attributes for accessibility
    if (isCorrect) {
        element.setAttribute("aria-invalid", "false");
        element.setAttribute("aria-label", `${element.value} - ${translateText("fill-in-the-blank-correct-answer")}`);

        // Add matching green border and focus styles to input
        element.classList.remove("border-red-500", "focus:border-red-500", "focus:ring-red-200");
        element.classList.add("border-green-500", "bg-green-100", "focus:border-green-500", "focus:ring-green-200", "focus:ring");
    } else {
        element.setAttribute("aria-invalid", "true");
        element.setAttribute("aria-label", `${element.value} - ${translateText("fill-in-the-blank-try-again")}`);

        // Add matching red border and focus styles to input
        element.classList.remove("border-green-500", "focus:border-green-500", "focus:ring-green-200");
        element.classList.add("border-red-500", "focus:border-red-500", "focus:ring-red-200", "focus:ring");
    }
    
    // Position the icon element absolutely related to the input
    const rect = element.getBoundingClientRect();
    const parentRect = element.parentNode.getBoundingClientRect();
    
    // Calculate position relative to the parent
    const top = rect.top - parentRect.top + (rect.height - 24) / 2; // Center icon vertically (24px is approx icon height)
    const right = parentRect.right - rect.right + 10;
    
    // Set the position
    iconElement.style.top = `${top}px`;
    iconElement.style.right = `${right}px`;
    
    // Make sure parent has position relative or absolute
    const parentPosition = window.getComputedStyle(element.parentNode).position;
    if (parentPosition === 'static') {
        element.parentNode.style.position = 'relative';
    }
    
    // Add the icon after the input (as a sibling)
    element.parentNode.insertBefore(iconElement, element.nextSibling);
};

const handleMultipleChoiceFeedback = (feedback, isCorrect, element) => {
    const label = element.closest(".activity-option");
    if (!label) return;

    const associatedLabel = label.querySelector("span");
    if (!associatedLabel) return;

    const existingMark = associatedLabel.querySelector(".mark");
    existingMark?.remove();

    if (isCorrect) {
        updateForCorrectChoice(feedback, null, associatedLabel);
    } else {
        updateForIncorrectChoice(feedback, null, associatedLabel);
    }
};

const updateForCorrectChoice = (feedback, mark, associatedLabel) => {
    // Remove the feedback span
    feedback.remove();
    
    // Clear existing marks
    const existingMark = associatedLabel.querySelector(".mark");
    if (existingMark) existingMark.remove();
    
    // Create a Font Awesome check icon
    const icon = document.createElement("i");
    icon.className = "fas fa-check-circle text-green-600 mark tick ml-2";
    icon.setAttribute("aria-hidden", "true");
    
    // Add the icon to the label
    associatedLabel.appendChild(icon);
    
    // Add a screen reader text for accessibility
    const srText = document.createElement("span");
    srText.className = "sr-only";
    srText.textContent = translateText("multiple-choice-correct-answer");
    associatedLabel.appendChild(srText);
    
    // Add success background
    associatedLabel.classList.add("bg-green-100", "border-green-600", "border-2");
};

const updateForIncorrectChoice = (feedback, mark, associatedLabel) => {
    // Remove the feedback span
    feedback.remove();
    
    // Clear existing marks
    const existingMark = associatedLabel.querySelector(".mark");
    if (existingMark) existingMark.remove();
    
    // Create a Font Awesome x icon
    const icon = document.createElement("i");
    icon.className = "fas fa-times-circle text-red-600 mark cross ml-2";
    icon.setAttribute("aria-hidden", "true");
    
    // Add the icon to the label
    associatedLabel.appendChild(icon);
    
    // Add a screen reader text for accessibility
    const srText = document.createElement("span");
    srText.className = "sr-only";
    srText.textContent = translateText("multiple-choice-try-again");
    associatedLabel.appendChild(srText);
    
    // Add error background
    associatedLabel.classList.add("bg-red-100", "border-red-600", "border-2");
};

export const retryActivity = () => {
    console.log("=== Retrying Activity ===");
    playActivitySound('reset');
    
    clearFeedback();
    resetButtons();
    resetButtonState();
    
    console.log("=== Retry Setup Complete ===");
};

const clearFeedback = () => {
    // Remove feedback spans
    document.querySelectorAll(".feedback").forEach(feedback => {
        feedback.remove();
    });

    // Remove feedback icons from text inputs
    // document.querySelectorAll("[class^='feedback-icon-for-']").forEach(icon => {
    //     icon.remove();
    // });
    
    // Remove feedback icons from text inputs
    document.querySelectorAll(".fas.fa-check-circle, .fas.fa-times-circle").forEach(icon => {
        if (!icon.classList.contains("mark")) { // Don't remove icons that are part of multiple choice marks
            icon.remove();
        }
    });
    
    // Reset input fields styling
    document.querySelectorAll("input[type='text'], textarea").forEach(input => {
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-label");

        // Remove the colored borders and focus rings
        input.classList.remove(
            "border-green-500", "focus:border-green-500", "focus:ring-green-200",
            "border-red-500", "focus:border-red-500", "focus:ring-red-200",
            "focus:ring"
        );
    });
    
    // Reset multiple choice options styling
    document.querySelectorAll(".activity-option span").forEach(label => {
        label.classList.remove("bg-green-100", "bg-red-100", "border-green-600", "border-red-600", "border-2");
        const mark = label.querySelector(".mark");
        if (mark) mark.remove();
        const srText = label.querySelector(".sr-only");
        if (srText) srText.remove();
    });

    const toast = document.getElementById("toast");
    if (toast) {
        toast.remove();
    }
};

const resetButtons = () => {
    const allRadioButtons = document.querySelectorAll("input[type='radio']");
    allRadioButtons.forEach(button => {
        console.log("Resetting radio button:", button);
        button.classList.remove("bg-green-200", "bg-red-200", "text-black");
    });
};

const resetButtonState = () => {
    state.selectedButton = null;
    console.log("Reset selectedButton to null");

    const submitButton = document.getElementById("submit-button");
    if (submitButton) {
        console.log("Resetting submit button");
        submitButton.textContent = translateText("submit-text");
        submitButton.setAttribute("aria-label", translateText("submit-text"));

        submitButton.removeEventListener("click", state.retryHandler);
        submitButton.removeEventListener("click", state.validateHandler);
        submitButton.addEventListener("click", state.validateHandler);
        console.log("Restored validation handler");
    }
};


// Add any other utility functions you need here...

const setToastStyle = (toast, type = 'success') => {
    // First remove all styling classes
    toast.classList.remove(
        "bg-red-100", "bg-white", "bg-yellow-100", "bg-green-100", "bg-blue-100", "text-red-700", 
        "border-red-400", "border-yellow-400", "border-green-400", 
        "border-l-4"
    );
    
    // Then apply the correct styling based on type
    switch (type) {
        case 'success':
            toast.classList.add("border-green-600", "bg-green-100");
            break;
        case 'warning':
            toast.classList.add("border-yellow-600", "bg-yellow-100");
            break;
        case 'error':
            toast.classList.add("border-red-600", "bg-red-100");
            break;
        default:
            toast.classList.add("border-blue-600", "bg-blue-100");
    }
};

// Helper function to add close button to toast
const addCloseButtonToToast = (toast) => {
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'absolute -top-2 -right-2 bg-white border-1 border-gray-500 hover:bg-gray-300 rounded-full w-6 h-6 flex items-center justify-center transition-colors shadow-[1px_1px_2px_rgba(0,0,0,0.2)]';
    closeButton.setAttribute('aria-label', translateText("close"));
    closeButton.setAttribute('type', 'button');
    
    // Create X icon
    const closeIcon = document.createElement('i');
    closeIcon.className = 'fas fa-times text-gray-600 text-xs';
    
    // Add close functionality
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toast.classList.add('hidden');
    });
    
    closeButton.appendChild(closeIcon);
    toast.appendChild(closeButton);
};

// Modify your toast setup function to use relative positioning
const setupToast = (toast, type = 'success', emoji, message, showCloseButton = true) => {
    // Clear existing content
    toast.innerHTML = '';
    
    // Make sure positioning is preserved - add these if they don't exist
    toast.classList.add('fixed', 'top-10', 'left-1/2', 'transform', '-translate-x-1/2');
    
    toast.classList.remove('hidden');
    
    // Create emoji span element
    const emojiSpan = document.createElement('span');
    emojiSpan.className = 'text-2xl mr-2';
    emojiSpan.textContent = emoji; 
    
    // Create text paragraph
    const textP = document.createElement('p');
    textP.className = 'text-gray-800 font-medium';
    textP.innerHTML = message;
    
    // Apply styling
    setToastStyle(toast, type);
    
    // Add elements to toast
    toast.appendChild(emojiSpan);
    toast.appendChild(textP);
    
    // Add the close button if requested
    if (showCloseButton) {
        addCloseButtonToToast(toast);
    }
};

// Set up click-outside functionality for toast dismissal
document.addEventListener('DOMContentLoaded', () => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    // Add click listener to document
    document.addEventListener('click', (e) => {
        // If toast is visible and click is outside toast
        if (!toast.classList.contains('hidden') && !toast.contains(e.target)) {
            toast.classList.add('hidden');
        }
    });
    
    // Prevent clicks inside the toast from closing it
    toast.addEventListener('click', (e) => {
        e.stopPropagation();
    });
});

