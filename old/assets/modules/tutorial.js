import { translateText } from './translations.js'; // Import translation function
import { announceToScreenReader } from './ui_utils.js'; // Import screen reader utility

// Tutorial module for onboarding new users
const TUTORIAL_SEEN_KEY = 'tutorial_completed';

// Tutorial steps content (can be translated later)
const tutorialSteps = [
  {
    title: "1/3",
    content: "tutorial-step-1-content",
    position: "left", // Position of the tooltip relative to the UI element
    arrow: "left", // Arrow direction
    targetElementId: "nav-popup", // ID of the element this step points to
    targetElementClass: "nav__toggle" // Class to identify when cloning the element
  },
  {
    title: "2/3",
    content: "tutorial-step-2-content",
    position: "center",
    arrow: "bottom",
    targetElementId: "back-forward-buttons",
    targetElementClass: "navigation-buttons"
  },
  {
    title: "3/3",
    content: "tutorial-step-3-content",
    position: "right",
    arrow: "right",
    targetElementId: "open-sidebar",
    targetElementClass: "sidebar-toggle"
  }
];

let currentStepIndex = 0;
let tutorialOverlay;
let tutorialPopup;
let welcomePopup;
let popupContainer;

// Create and show the welcome dialog before starting the tutorial
export const showWelcome = () => {
  //Check if user has already seen the tutorial
  if (localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true') {
    return;
  }

  // Create overlay
  tutorialOverlay = document.createElement('div');
  tutorialOverlay.className = 'tutorial-overlay';
  tutorialOverlay.setAttribute('role', 'dialog');
  tutorialOverlay.setAttribute('aria-modal', 'true');
  tutorialOverlay.setAttribute('aria-labelledby', 'welcome-title');
  tutorialOverlay.setAttribute('aria-describedby', 'welcome-description');

  // Create welcome popup
  welcomePopup = document.createElement('div');
  welcomePopup.className = 'tutorial-popup welcome-popup';
  welcomePopup.style.maxWidth = '400px';
  welcomePopup.style.textAlign = 'center';
  welcomePopup.setAttribute('tabindex', '0'); // Make focusable

  // Add wave emoji
  const emoji = document.createElement('div');
  emoji.className = 'welcome-emoji';
  emoji.textContent = '👋';
  emoji.style.fontSize = '48px';
  emoji.style.marginBottom = '10px';
  emoji.setAttribute('role', 'img');
  emoji.setAttribute('aria-label', translateText("tutorial-welcome-emoji-label")); // Add aria-label for screen readers

  // Add welcome title
  const welcomeTitle = document.createElement('h2');
  welcomeTitle.className = 'welcome-title';
  welcomeTitle.id = 'welcome-title'; // Add ID for aria-labelledby
  //welcomeTitle.textContent = 'Welcome to Cuaderno 5';
  // Spanish version of the text.
  welcomeTitle.textContent = translateText("tutorial-welcome-title");

  welcomeTitle.style.fontSize = '24px';
  welcomeTitle.style.fontWeight = 'bold';
  welcomeTitle.style.marginBottom = '10px';

  // Add subtitle text
  const welcomeText = document.createElement('p');
  welcomeText.className = 'welcome-text';
  //welcomeText.innerHTML = 'in its new accessible format!';
  // Spanish version of the text.
  welcomeText.innerHTML = translateText("tutorial-welcome-content");
  welcomeText.style.fontSize = '20px';
  welcomeText.style.marginBottom = '20px';

  // Add description
  const description = document.createElement('p');
  description.className = 'welcome-description';
  description.id = 'welcome-description'; // Add ID for aria-describedby
  //description.innerHTML = "Before you dive in, here's a quick tour to show you how to navigate, use the menu, and access helpful features. It won't take long!";
  // Spanish version of the text.
  description.innerHTML = translateText("tutorial-description-content");
  description.style.color = '#4a5568';
  description.style.lineHeight = '1.5';
  description.style.marginBottom = '24px';
  description.style.fontSize = '16px';

  // Add start button
  const startButton = document.createElement('button');
  startButton.textContent = translateText("tutorial-start-button-content");
  startButton.className = 'tutorial-finish text-base py-2 px-5';
  startButton.setAttribute('aria-label', translateText("tutorial-start-button-aria-label"));

  // Add exit button with a grey x in the top right
  const exitButton = document.createElement('button');
  exitButton.className = 'exit-button absolute top-2.5 right-5 bg-transparent border-0 cursor-pointer text-2xl text-gray-600';
  exitButton.setAttribute('aria-label', translateText("tutorial-exit-button-aria-label"));
  exitButton.textContent = '×'; // Using proper multiplication symbol instead of x

  exitButton.addEventListener('click', () => {
    // Close the welcome popup
    tutorialOverlay.remove();
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true'); // Mark tutorial as seen
    
    // Announce to screen readers that the tutorial is closed, but remind about shortcuts
    announceToScreenReader(
      translateText("tutorial-closed-announcement")
    );
  });
  // Append exit button to welcome popup
  welcomePopup.appendChild(exitButton);
  // Add event listener to exit button

  startButton.addEventListener('click', () => {
    // Hide welcome popup
    welcomePopup.remove();

    // Show tutorial steps
    showTutorial();
    
    // Announce first step with reminder of shortcuts
    announceToScreenReader(translateText("tutorial-starting-announcement"));
  });

  // Add elements to welcome popup
  welcomePopup.appendChild(emoji);
  welcomePopup.appendChild(welcomeTitle);
  welcomePopup.appendChild(welcomeText);
  welcomePopup.appendChild(description);
  welcomePopup.appendChild(startButton);

  // Add welcome popup to overlay
  tutorialOverlay.appendChild(welcomePopup);

  // Make tutorial visible
  document.body.appendChild(tutorialOverlay);

  // Improved focus management - focus the start button instead of the popup
  setTimeout(() => {
    startButton.focus();
  }, 100);

  // Add keyboard event listeners
  setupKeyboardNavigation(welcomePopup, [startButton]);

  // Announce welcome message with keyboard shortcuts to screen readers
  announceToScreenReader(translateText("tutorial-welcome-announcement"));
}

// Create and show the tutorial overlay
export const showTutorial = () => {
  // Create popup for tutorial steps
  tutorialPopup = document.createElement('div');
  tutorialPopup.className = 'tutorial-popup';
  tutorialPopup.setAttribute('tabindex', '0'); // Make focusable
  tutorialPopup.setAttribute('role', 'dialog');
  tutorialPopup.setAttribute('aria-modal', 'true');

  // Add to overlay
  tutorialOverlay.appendChild(tutorialPopup);

  // Show first step
  showStep(0);
}

// Show a specific tutorial step
const showStep = (index) => {
  if (index < 0 || index >= tutorialSteps.length) return;

  currentStepIndex = index;
  const step = tutorialSteps[index];

  // Clear previous content
  tutorialPopup.innerHTML = '';

  // Update aria attributes for the current step
  tutorialPopup.setAttribute('aria-labelledby', `tutorial-title-${index}`);
  tutorialPopup.setAttribute('aria-describedby', `tutorial-content-${index}`);

  // Get the actual target element
  const targetElement = document.getElementById(step.targetElementId);
  if (!targetElement) {
    console.error(`Target element #${step.targetElementId} not found`);
    return;
  }

  // Remove any previous cloned elements
  const existingClonedElement = document.querySelector('.cloned-element-container');
  if (existingClonedElement) {
    existingClonedElement.remove();
  }

  // Create a container for the cloned element
  const clonedElementContainer = document.createElement('div');
  clonedElementContainer.className = 'cloned-element-container';
  clonedElementContainer.setAttribute('aria-hidden', 'true'); // Hide from screen readers as it's decorative

  // Create an exact clone of the element using proper Tailwind classes
  let clonedElement;

  // Special handling for the navigation popup button (1st step)
  if (step.targetElementId === 'nav-popup') {
    clonedElement = document.createElement('button');
    clonedElement.id = 'cloned-nav-popup';
    clonedElement.className = 'px-4 py-3 bg-white text-gray-800 rounded-lg shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50 aria-expanded:bg-blue-700 aria-expanded:text-white';
    clonedElement.setAttribute('aria-label', 'Content Index Menu');
    clonedElement.setAttribute('type', 'button');

    // Add the icon
    const icon = document.createElement('i');
    icon.className = 'fas fa-list';
    icon.setAttribute('aria-hidden', 'true');

    // Append icon to button
    clonedElement.appendChild(icon);
  }
  // Special handling for other elements
  else if (step.targetElementId === 'back-forward-buttons') {
    // Clone the navigation buttons
    clonedElement = document.createElement('div');
    clonedElement.id = 'cloned-back-forward-buttons';
    clonedElement.className = 'flex flex-row-reverse items-center bg-white border border-gray-300 rounded-2xl shadow-md';

    // Create the forward button
    const forwardButton = document.createElement('button');
    forwardButton.className = 'text-2xl no-underline text-gray-800 px-4 py-2';
    forwardButton.setAttribute('aria-label', 'Next page');
    const forwardIcon = document.createElement('i');
    forwardIcon.className = 'fas fa-chevron-right';
    forwardButton.appendChild(forwardIcon);

    // Create the page number span
    const pageSpan = document.createElement('span');
    pageSpan.textContent = '1'; // Placeholder for page number
    pageSpan.className = 'align-text-bottom no-underline text-gray-800 px-4 py-2 text-2xl border-r border-gray-300';

    // Create the back button
    const backButton = document.createElement('button');
    backButton.className = 'text-2xl no-underline text-gray-800 px-4 py-2 border-r border-gray-300';
    backButton.setAttribute('aria-label', translateText("previous"));
    const backIcon = document.createElement('i');
    backIcon.className = 'fas fa-chevron-left';
    backButton.appendChild(backIcon);

    // Append all elements to the container
    clonedElement.appendChild(forwardButton);
    clonedElement.appendChild(pageSpan);
    clonedElement.appendChild(backButton);
  }
  else if (step.targetElementId === 'open-sidebar') {
    // Clone the sidebar toggle button
    clonedElement = document.createElement('button');
    clonedElement.id = 'cloned-open-sidebar';
    clonedElement.className = 'w-12 h-12 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-blue-500 shadow-lg';
    clonedElement.setAttribute('aria-label', translateText("tutorial-smart-utility-sidebar-label"));

    // Add the icon
    const icon = document.createElement('i');
    icon.className = 'fa fa-universal-access text-4xl text-gray-800';

    // Append icon to button
    clonedElement.appendChild(icon);
  }
  else {
    // Generic fallback cloning
    clonedElement = targetElement.cloneNode(true);
    clonedElement.id = `cloned-${step.targetElementId}`;
  }

  // Make the cloned element non-interactive but visible
  clonedElement.style.pointerEvents = 'none';
  clonedElement.className += ' cloned-interface-element';
  clonedElement.setAttribute('aria-hidden', 'true'); // Hide from screen readers

  // Position the cloned element based on original element position
  positionClonedElement(clonedElementContainer, targetElement, step.position);

  // Add the cloned element to its container
  clonedElementContainer.appendChild(clonedElement);

  // Add the container to the overlay
  tutorialOverlay.appendChild(clonedElementContainer);

  // Update popup position based on step
  updatePopupPosition(step.position, targetElement);

  // Add arrow
  if (step.arrow) {
    const arrow = document.createElement('div');
    arrow.className = `tutorial-arrow tutorial-arrow-${step.arrow}`;
    arrow.setAttribute('aria-hidden', 'true'); // Hide from screen readers as it's decorative
    tutorialPopup.appendChild(arrow);
  }

  // Create content
  const titleEl = document.createElement('h3');
  titleEl.className = 'tutorial-title';
  titleEl.id = `tutorial-title-${index}`;
  titleEl.textContent = step.title;

  const contentEl = document.createElement('div'); // Changed to div for better HTML content support
  contentEl.className = 'tutorial-content';
  contentEl.id = `tutorial-content-${index}`;

  // Set content directly as HTML - no additional processing needed
  contentEl.innerHTML = translateText(step.content);

  // Create buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'tutorial-buttons';

  // Skip button (always visible)
  const skipButton = document.createElement('button');
  skipButton.textContent = translateText("tutorial-skip");
  skipButton.className = 'tutorial-skip';
  skipButton.classList.add('underline');
  skipButton.addEventListener('click', completeTutorial);

  // Action button (Next or Finish based on step)
  const actionButton = document.createElement('button');
  if (index === tutorialSteps.length - 1) {
    actionButton.textContent = translateText("finish");
    actionButton.className = 'tutorial-finish';
    actionButton.addEventListener('click', completeTutorial);
  } else {
    actionButton.textContent = translateText('next');
    actionButton.className = 'tutorial-next';
    actionButton.addEventListener('click', () => {
      showStep(index + 1);
    });
  }

  // Add buttons to container
  buttonsContainer.appendChild(skipButton);
  buttonsContainer.appendChild(actionButton);

  // Add all elements to popup
  tutorialPopup.appendChild(titleEl);
  tutorialPopup.appendChild(contentEl);
  tutorialPopup.appendChild(buttonsContainer);

  // Set focus to the tutorial popup for accessibility
  tutorialPopup.focus();

  // Add keyboard event listeners for this step
  setupKeyboardNavigation(tutorialPopup, [skipButton, actionButton]);

  // Announce to screen readers that a new step is shown
  announceToScreenReader(
    translateText("tutorial-step-announcement", {
      currentStep: index + 1, 
      totalSteps: tutorialSteps.length,
      stepContent: translateText(step.content).replace(/<[^>]*>?/gm, '')
    })
  );
}

// Setup keyboard navigation for the tutorial
const setupKeyboardNavigation = (container, focusableElements) => {
  container.addEventListener('keydown', (event) => {
    // Handle Escape key to exit tutorial
    if (event.key === 'Escape') {
      completeTutorial();
      event.preventDefault();
    }

    // Handle Tab key for focus management
    if (event.key === 'Tab') {
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift+Tab on first element should loop to last
      if (event.shiftKey && document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      }
      // Tab on last element should loop to first
      else if (!event.shiftKey && document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  });
}

// Position the cloned element in the same position as the original
const positionClonedElement = (container, originalElement, position) => {
  const rect = originalElement.getBoundingClientRect();

  container.style.position = 'absolute';
  container.style.left = `${rect.left}px`;
  container.style.top = `${rect.top}px`;
  container.style.width = `${rect.width}px`;
  container.style.height = `${rect.height}px`;
  container.style.zIndex = '10002'; // Higher than the overlay
}

// Update popup position based on the target UI element
const updatePopupPosition = (position, targetElement) => {
  // Reset any previous positioning
  tutorialPopup.style.position = 'absolute';
  tutorialPopup.style.top = '';
  tutorialPopup.style.bottom = '';
  tutorialPopup.style.left = '';
  tutorialPopup.style.right = '';
  tutorialPopup.style.transform = '';

  // Get the bounding rectangle of the target element
  const targetRect = targetElement.getBoundingClientRect();

  // Position the popup based on the target element and the step position
  switch (position) {
    case 'left':
      // Position near the left element (nav popup) - now using bottom positioning
      tutorialPopup.style.left = `${targetRect.right + 20}px`;
      // Calculate bottom position rather than top
      tutorialPopup.style.bottom = `${window.innerHeight - targetRect.bottom + 20}px`;
      break;
    case 'center':
      // Position above the navigation arrows
      tutorialPopup.style.bottom = `${window.innerHeight - targetRect.top + 20}px`;
      tutorialPopup.style.left = `${targetRect.left + (targetRect.width / 2) - 175}px`;
      break;
    case 'right':
      // Position near the right element (accessibility button)
      tutorialPopup.style.right = `${window.innerWidth - targetRect.left + 20}px`;
      tutorialPopup.style.top = `${targetRect.top + (targetRect.height / 2) - 10}px`;
      break;
    default:
      // Default to center if position is not recognized
      tutorialPopup.style.top = '50%';
      tutorialPopup.style.left = '50%';
      tutorialPopup.style.transform = 'translate(-50%, -50%)';
  }
}

// Mark tutorial as complete and remove overlay
const completeTutorial = () => {
  // Mark as seen in localStorage
  localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');

  // Remove overlay with a fade-out effect
  tutorialOverlay.style.opacity = '0';
  tutorialOverlay.style.transition = 'opacity 0.3s ease';

  // Remove popup container if it exists
  if (popupContainer) {
    popupContainer.style.opacity = '0';
    popupContainer.style.transition = 'opacity 0.3s ease';
  }

  // Remove the live region
  const liveRegion = document.getElementById('tutorial-announcer');
  if (liveRegion) {
    liveRegion.remove();
  }

  // Restore focus to a sensible element after closing tutorial
  const targetElement = document.getElementById(tutorialSteps[currentStepIndex].targetElementId);

  setTimeout(() => {
    if (tutorialOverlay && tutorialOverlay.parentNode) {
      tutorialOverlay.parentNode.removeChild(tutorialOverlay);
    }
    if (popupContainer && popupContainer.parentNode) {
      popupContainer.parentNode.removeChild(popupContainer);
    }

    // Return focus to the element being highlighted in the tutorial
    if (targetElement) {
      targetElement.focus();
    }

    // Announce that tutorial is closed
    announceToScreenReader(translateText("tutorial-completed-announcement"));
  }, 300);
}

// Reset tutorial status (for testing/development)
export const resetTutorial = () => {
  localStorage.removeItem(TUTORIAL_SEEN_KEY);
}

// Initialize tutorial
export const initTutorial = () => {
  // Check if we need to force show tutorial via URL parameter
  if (window.location.hash.includes('showTutorial')) {
    resetTutorial();
  }

  // Make sure CSS is loaded
  loadTutorialStyles();

  // Show welcome screen first, then tutorial
  setTimeout(showWelcome, 300); // Increased delay to ensure all UI elements are loaded
}

// Ensure the tutorial CSS is loaded
const loadTutorialStyles = () => {
  // Skip if the stylesheet is already added
  if (document.querySelector('link[href*="tutorial.css"]')) return;

  // Create link element
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = './assets/modules/tutorial.css';

  // Append to head
  document.head.appendChild(link);
}