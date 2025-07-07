import { state, setState } from '../state.js';
import { playActivitySound } from '../audio.js';
import { ActivityTypes, updateSubmitButtonAndToast } from '../utils.js';
import { announceToScreenReader } from '../ui_utils.js';
import { translateText } from '../translations.js';
import { executeMail } from './send-email.js';
import { updateResetButtonVisibility } from '../../activity.js';

export const prepareSorting = (section) => {
  setupWordCards(section);
  setupCategories();
  setupFeedbackReset(section);

  // Load saved data only after setup is complete
  setTimeout(() => {
    loadFromLocalStorage();
  }, 0);
};

const setupWordCards = (section) => {
  const wordCards = section.querySelectorAll(".word-card");
  wordCards.forEach((wordCard) => {
    addWordCardListeners(wordCard);
    styleWordCard(wordCard);
  });
};


// this is for take de id for localstorage
const activity = () => {
  const activityElement = document.querySelector('[data-aria-id]');
  if (!activityElement) {
    return
  }

  const activity = activityElement.getAttribute('data-aria-id');

  const activityId = location.pathname
    .substring(location.pathname.lastIndexOf("/") + 1)
    .split(".")[0];

  const localStorageKey = `${activityId}_${activity}`;
  if (document.getElementsByTagName("h1").length < 0) {
    localStorage.setItem("namePage", document.getElementsByTagName("h2")[0].innerText);
} else if (document.getElementsByTagName("h1").length > 0) {
    localStorage.setItem("namePage", document.getElementsByTagName("h1")[0].innerText);
}

  
  return localStorageKey
}

const addWordCardListeners = (wordCard) => {
  wordCard.addEventListener("click", () => selectWordSort(wordCard));
  wordCard.addEventListener('dragstart', handleDragStart);
  wordCard.addEventListener("mousedown", () => highlightBoxes(true));
  wordCard.addEventListener("mouseup", () => highlightBoxes(false));
  wordCard.addEventListener("keydown", (event) => handleWordCardKeydown(event, wordCard));


  // Make images inside cards not draggable
  const cardImage = wordCard.querySelector('img');
  if (cardImage) {
    cardImage.setAttribute('draggable', 'false');
    cardImage.style.pointerEvents = 'none';
  }
}

const handleWordCardKeydown = (event, wordCard) => {
  // Prevent arrow keys from triggering page navigation
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || 
      event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.stopPropagation();
    
    // Handle arrow navigation
    handleArrowNavigation(event.key, wordCard);
    return;
  }
  
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    selectWordSort(wordCard);
  }
};

const styleWordCard = (wordCard) => {
  wordCard.classList.add(
    "cursor-pointer",
    "transition",
    "duration-300",
    "hover:bg-yellow-300",
    "transform",
    "hover:scale-105"
  );
};

const setupCategories = () => {
  const categories = document.querySelectorAll('section .category');
  categories.forEach((category) => {
    category.setAttribute('tabindex', '0');
    ///////////////////////////////////////
    category.setAttribute('role', 'listbox'); // ADD THIS
    ///////////////////////////////////////
    category.addEventListener('dragover', allowDrop);
    category.addEventListener('drop', dropSort);

    ///////// Add labels to  categoires in dropzone
      // Find the preceding heading (h2) to label the category
      const heading = category.previousElementSibling;
      if (heading && heading.tagName.toLowerCase().startsWith('h')) {
        // Ensure heading has an ID
        if (!heading.id) {
          heading.id = `category-label-${category.getAttribute('data-activity-category')}`;
        }
        category.setAttribute('aria-labelledby', heading.id);
      }
    //////////////////////////////////////

    category.addEventListener('click', (e) => {
       // Add this logic to handle placing a selected word on category click
       if (state.currentWord) {
        // Prevent placing if the click target is already a placed word within the category
        if (e.target.closest('.placed-word')) {
            // Optionally, allow clicking a placed word to remove it,
            // but prevent placing a *new* word if clicking on an existing one.
            // If removeWord handles its own click, this stopPropagation might be sufficient.
            e.stopPropagation();
            return; // Don't place a new word if clicking on an existing placed one
        }
        // If a word is selected, place it in this category
        placeWord(category.getAttribute('data-activity-category'));
      }
    });

    category.addEventListener('keydown', (e) => {
      // Prevent arrow keys from triggering page navigation
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || 
          e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.stopPropagation();
        
        // Handle arrow navigation
        handleArrowNavigation(e.key, category);
        return;
      }
      
      if (state.currentWord && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        const categoryName = category.getAttribute('data-activity-category');
        placeWord(categoryName);
      }
    });
  });
};

// Add a new function to handle arrow navigation
const handleArrowNavigation = (key, currentElement) => {
  // Get all interactive elements in the activity
  const allElements = [
    ...document.querySelectorAll('.word-card:not(.bg-gray-300)'), // Available word cards
    ...document.querySelectorAll('.category'),                    // Category dropzones
    ...document.querySelectorAll('.placed-word')                  // Placed word cards
  ];
  
  // Get the current element's position
  const rect = currentElement.getBoundingClientRect();
  const currentCenter = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
  
  // Find the next element based on arrow direction
  let closestElement = null;
  let minDistance = Infinity;
  
  allElements.forEach(element => {
    if (element === currentElement) return; // Skip the current element
    
    const elementRect = element.getBoundingClientRect();
    const elementCenter = {
      x: elementRect.left + elementRect.width / 2,
      y: elementRect.top + elementRect.height / 2
    };
    
    // Calculate distance and direction
    const deltaX = elementCenter.x - currentCenter.x;
    const deltaY = elementCenter.y - currentCenter.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Check if the element is in the correct direction
    let isInDirection = false;
    
    switch (key) {
      case 'ArrowLeft':
        isInDirection = deltaX < -10; // Element is to the left
        break;
      case 'ArrowRight':
        isInDirection = deltaX > 10;  // Element is to the right
        break;
      case 'ArrowUp':
        isInDirection = deltaY < -10; // Element is above
        break;
      case 'ArrowDown':
        isInDirection = deltaY > 10;  // Element is below
        break;
    }
    
    // If in the right direction and closer than current closest
    if (isInDirection && distance < minDistance) {
      minDistance = distance;
      closestElement = element;
    }
  });
  
  // Focus the closest element if found
  if (closestElement) {
    closestElement.focus();
  }
};

const setupFeedbackReset = () => {
  const feedback = document.querySelector("#feedback");
  if (feedback) {
    feedback.addEventListener("click", resetActivity);
  }
};

export const resetActivity = () => {
  // Remove all placed word cards
  const placedWordCards = document.querySelectorAll('section .placed-word');
  placedWordCards.forEach((placedWordCard) => {
    placedWordCard.remove();
  });

  // Restore original word cards
  const originalWordCards = document.querySelectorAll('section .word-card');
  originalWordCards.forEach((wordCard) => {
    restoreOriginalCard(wordCard);
  });

    // Reset state variables
    setState('currentWord', "");
    if (state) state.inCategoryNavigation = false;

    // Remove any visual feedback
    const feedbackElement = document.getElementById("feedback");
    if (feedbackElement) {
      feedbackElement.textContent = "";
      feedbackElement.classList.remove("text-red-500", "text-green-500");
    }

    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = "";
      toast.classList.add("hidden");
      toast.classList.remove("bg-red-200", "text-red-700", "bg-green-200", "text-green-700");
    }

    // Reset categories' visual state
    highlightBoxes(false);

    // Clear localStorage for this activity
    clearSortingLocalStorage();

    // Try to play reset sound if audio module is loaded
    try {
      if (typeof playActivitySound === 'function') {
        playActivitySound('reset');
      }
    } catch (error) {
      console.warn("Could not play reset sound:", error);
    }
  };

// New function to clear localStorage data for sorting activities
const clearSortingLocalStorage = () => {
  try {
    const activityId = location.pathname
      .substring(location.pathname.lastIndexOf("/") + 1)
      .split(".")[0];
    
    // Get all localStorage keys for this activity
    const localStorageKeys = Object.keys(localStorage).filter(key => 
      key.startsWith(`${activityId}_`)
    );
    
    // Remove all matching localStorage items
    localStorageKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Also try to remove the activity-specific item
    const activityKey = activity();
    if (activityKey) {
      localStorage.removeItem(activityKey);
    }
    
    console.log(`Cleared ${localStorageKeys.length + (activityKey ? 1 : 0)} localStorage items for activity ${activityId}`);
  } catch (error) {
    console.error("Error clearing sorting localStorage:", error);
  }
};

export const handleDragStart = (event) => {
  const wordCard = event.target.closest('.word-card');
  if (!wordCard) return;

  if (wordCard.classList.contains('bg-gray-300')) {
    event.preventDefault();
    return;
  }

  event.dataTransfer.setData('text', wordCard.getAttribute('data-activity-item'));
  wordCard.classList.add('selected');

  if (event.dataTransfer.setDragImage) {
    event.dataTransfer.setDragImage(wordCard, 0, 0);
  }

  highlightBoxes(true);
};

export const highlightBoxes = (state) => {
  const categories = document.querySelectorAll("section .category");
  categories.forEach((category) => {
    if (state) {
      category.classList.add("bg-blue-100", "border-blue-400");
    } else {
      category.classList.remove("bg-blue-100", "border-blue-400");
    }
  });
};

export const selectWordSort = (wordCard) => {
  if (wordCard.classList.contains("bg-gray-300")) {
    // Remove the word card from the category
    const placedWordCard = document.querySelector(`.placed-word[data-activity-item="${wordCard.getAttribute('data-activity-item')}"]`);
    if (placedWordCard) {
      placedWordCard.remove();
      restoreOriginalCard(wordCard);
    }
    return;
  }

  // Remove selection from all other word cards
  document.querySelectorAll("section .word-card")
    .forEach((card) => card.classList.remove("border-blue-700"));

  wordCard.classList.remove("border-gray-300");  
  wordCard.classList.add("border-blue-700", "border-2", "box-border");

  setState('currentWord', wordCard.getAttribute("data-activity-item"));
  // Enable category navigation mode and focus first category
  state.inCategoryNavigation = true;
  const firstCategory = document.querySelector('section .category');
  if (firstCategory) {
    firstCategory.focus();

    // Get number of items in this category
    const itemCount = firstCategory.querySelector('.word-list')?.children.length || 0;
    const categoryName = firstCategory.getAttribute('aria-label');

    announceToScreenReader(
      `Selected: ${wordCard.textContent.trim()}. ` +
      `Now focused on ${categoryName} which contains ${itemCount} items. ` +
      `Press Enter to place here, or use arrow keys to move between categories.`
    );
  }
  highlightBoxes(true);
};

const restoreOriginalCard = (wordCard) => {
  wordCard.classList.remove(
    "bg-gray-300",
    "cursor-not-allowed",
    "text-gray-400",
    "hover:bg-gray-300",
    "hover:scale-100"
  );
  wordCard.style.border = "";
  wordCard.classList.add("cursor-pointer", "transition", "duration-300", "hover:bg-yellow-300", "transform", "hover:scale-105");
  wordCard.addEventListener("click", () => selectWordSort(wordCard));
};


const removeWord = (listItem) => {


  console.log("=== Starting removeWord function ===");

  const placedItemId = listItem.getAttribute('data-activity-item');

  console.log("Removing word:", placedItemId);

  const parentCategory = listItem.closest('[data-activity-category]');

  const categoryName = parentCategory.getAttribute('data-activity-category');

  const savedData = JSON.parse(localStorage.getItem('wordPlacement')) || {};
  if (savedData[categoryName]) {
    savedData[categoryName] = savedData[categoryName].filter(word => word !== placedItemId);
    if (savedData[categoryName].length === 0) {
      delete savedData[categoryName];
    }
    localStorage.setItem('wordPlacement', JSON.stringify(savedData));
  }

  listItem.remove();
  console.log("\nRemoving placed card from category");

  let wordCard = document.querySelector(`section .word-card[data-activity-item="${placedItemId}"]`);

  if (wordCard) {
    console.log("\nFound original card in bottom row:");
    console.log("- Text:", wordCard.textContent.trim());
    console.log("- Current classes:", wordCard.classList.toString());

    const newWordCard = wordCard.cloneNode(true);
    wordCard.parentNode.replaceChild(newWordCard, wordCard);

    newWordCard.classList.remove(
      "bg-gray-300",
      "cursor-not-allowed",
      "text-gray-400",
      "hover:bg-gray-300",
      "hover:scale-100"
    );

    newWordCard.classList.add(
      "cursor-pointer",
      "transition",
      "duration-300",
      "hover:bg-yellow-300",
      "transform",
      "hover:scale-105"
    );

    newWordCard.style.border = "";
    newWordCard.setAttribute('draggable', 'true');

    addWordCardListeners(newWordCard);

    console.log("\nFinal card state:");
    console.log("- Classes:", wordCard.classList.toString());
    console.log("- Draggable:", wordCard.getAttribute('draggable'));
    console.log("- Style:", wordCard.style.cssText);
    saveToLocalStorage();
    playActivitySound('reset');
  } else {
    console.error(`Could not find original card with id: ${placedItemId}`);
    console.log("All bottom word-cards:", 
      Array.from(document.querySelectorAll('section .word-card:not(.placed-word)'))
        .map(card => `${card.textContent.trim()} (${card.getAttribute('data-activity-item')})`));
  }

  console.log("\nRemoving placed card from category");
  listItem.remove();
  console.log("=== removeWord function complete ===\n");
};

export const placeWord = (category) => {
  if (!state.currentWord) {
    console.log("No word selected.");
    return;
  }

  playActivitySound('drop');

  const categoryDiv = document.querySelector(
    `div[data-activity-category="${category}"]`
  );
  const listElement = categoryDiv?.querySelector("section .word-list");

  if (!listElement) {
    console.error(`Category "${category}" not found or no word list available.`);
    return;
  }

  const wordCard = document.querySelector(
    `.word-card[data-activity-item="${state.currentWord}"]`
  );
  if (!wordCard) {
    console.error(`Word card for "${state.currentWord}" not found.`);
    return;
  }

  // Place the word in the category
  const placedWordCard = handleWordPlacement(wordCard, listElement);

  // Important: Reset the selection state immediately to prevent duplication
  //const currentWordText = wordCard.textContent.trim();
  //const categoryName = listElement.closest('.category').getAttribute('data-activity-category');
  resetSelectionState();

  //////////////////////////////////////////////
  // Focus the newly placed card
  const placed = listElement.lastElementChild;
  if (placed) {
    placed.focus();
    announceToScreenReader(`Placed ${placed.textContent.trim()} in ${categoryDiv.getAttribute("aria-label")}`);
  }
  /////////////////////////////////////////////

  saveToLocalStorage();

  // Find the next available option
  const remainingWordCards = document.querySelectorAll(
    `.word-card:not(.bg-gray-300)`
  );
  
  if (remainingWordCards.length > 0) {
    const nextWordCard = remainingWordCards[0];
    
    // // Announce the placement
    // announceToScreenReader(`${currentWordText} colocado en ${categoryName}.`, true);
    
    // Add a screen-reader-only button to the placed word card
    addNextOptionButton(placedWordCard, nextWordCard);
  } else {
    announceToScreenReader("Todos los elementos han sido colocados. Puede revisar sus colocaciones o enviar.", true);
  }
};

// Function to add a screen-reader-only "next option" button
const addNextOptionButton = (placedWordCard, nextWordCard) => {
  // Get the category container
  const categoryContainer = placedWordCard.closest('.category');
  if (!categoryContainer) return;
  
  // Check if we already have a "next option" button in this category
  const existingButton = categoryContainer.querySelector('.next-option-button');
  if (existingButton) {
    existingButton.remove(); // Remove any existing button before adding a new one
  }
  
  // Remove any existing "next option" buttons from other categories
  document.querySelectorAll('.next-option-button').forEach(button => {
    button.remove();
  });
  
  const nextButton = document.createElement('button');
  nextButton.className = 'sr-only focus:not-sr-only focus:absolute focus:z-50 bg-blue-600 text-white p-2 rounded next-option-button focus:ring-2 focus:ring-blue-300';
  nextButton.textContent = "Volver a la siguiente opción disponible";
  nextButton.setAttribute('aria-label', "Volver a la siguiente opción disponible");
  
  nextButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent triggering parent events
    goToNextOption(nextWordCard);
  });
  
  nextButton.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      goToNextOption(nextWordCard);
    }
  });
  
  // Add as the first element inside the category container
  //placedWordCard.parentNode.insertBefore(nextButton, placedWordCard.nextSibling);

  //Check if this message is in the code.
};

const goToNextOption = (nextWordCard) => {
  // First remove all next option buttons
  document.querySelectorAll('.next-option-button').forEach(button => {
    button.remove();
  });
  
  nextWordCard.focus();
  setState('currentWord', nextWordCard.getAttribute('data-activity-item'));
};

const handleWordPlacement = (wordCard, listElement) => {
  const clonedWordCard = wordCard.cloneNode(true);
  setupClonedCard(clonedWordCard);

  listElement.classList.add("flex", "flex-wrap");
  listElement.appendChild(clonedWordCard);

  disableOriginalCard(wordCard);
  
  return clonedWordCard; // Return the placed card so we can add buttons to it
};

const setupClonedCard = (clonedCard) => {
  if (clonedCard.querySelector('img')) {
    setupImageCard(clonedCard);
  } else {
    setupTextCard(clonedCard);
  }

  // Enhanced styling for placed cards
  clonedCard.classList.add(
    'placed-word',
    'max-w-40',
    'm-2',
    'p-2',
    'cursor-pointer',
    'hover:bg-red-100',  // Hover suggests removal
    'bg-blue-50',        // Light blue background to indicate placement
    'border-2',          // More visible border
    'border-blue-300',   // Blue border to indicate successful placement
    'rounded-md',        // Rounded corners
    'shadow-sm',         // Subtle shadow
    'transition-all'     // Smooth transitions for hover effects
  );

  // Add role and aria attributes for screen readers
  clonedCard.setAttribute('draggable', 'false');
  /////////////////////////////////////// Newly Added
  clonedCard.setAttribute('tabindex', '0');
  clonedCard.setAttribute('role', 'option');
  clonedCard.setAttribute('aria-selected', 'false');
  ///////////////////////////////////////
  //clonedCard.setAttribute('role', 'button');
  clonedCard.setAttribute('aria-label', `${clonedCard.textContent.trim()} - colocado correctamente. Presione Enter para quitar.`);
  
  clonedCard.addEventListener("click", function () {
    removeWord(this);
  });
  
  clonedCard.addEventListener("keydown", function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation(); // Stop the event from bubbling up to the category
      removeWord(this);
    }
  });
};

const setupTextCard = (card) => {
  const textWrapper = document.createElement('div');
  textWrapper.classList.add(
    'text-wrapper',
    'flex',
    'items-center',
    'justify-center',
    'w-full'
  );

  while (card.firstChild) {
    textWrapper.appendChild(card.firstChild);
  }
  card.appendChild(textWrapper);
};

const disableOriginalCard = (wordCard) => {
  if (!wordCard.classList.contains("placed-word")) {
    wordCard.classList.add(
      "bg-gray-300",
      "cursor-not-allowed",
      "text-gray-400",
      "hover:bg-gray-300",
      "hover:scale-100"
    );
    wordCard.style.border = "none";
    wordCard.classList.remove("selected", "shadow-lg");
    wordCard.removeEventListener("click", () => selectWordSort(wordCard));
  }
};

const setupImageCard = (card) => {
  const contentContainer = document.createElement('div');
  contentContainer.classList.add(
    'content-container',
    'flex',
    'flex-col',
    'items-center',
    'w-full',
    'space-y-2'
  );

  const textWrapper = document.createElement('div');
  textWrapper.classList.add(
    'text-wrapper',
    'flex',
    'items-center',
    'justify-center'
  );

  const image = card.querySelector('img');
  const text = card.querySelector('.word-text, span:not(.validation-mark)');

  if (image) {
    image.setAttribute('draggable', 'false');
    image.style.pointerEvents = 'none';
    contentContainer.appendChild(image);
  }
  if (text) {
    textWrapper.appendChild(text);
  }
  contentContainer.appendChild(textWrapper);

  while (card.firstChild) {
    card.removeChild(card.firstChild);
  }
  card.appendChild(contentContainer);
};


const resetSelectionState = () => {
  setState('currentWord', "");
  highlightBoxes(false);
};

// Remaining sorting activity functions...
export const allowDrop = (event) => {
  event.preventDefault();
};

export const dropSort = (event) => {
  event.preventDefault();
  const data = event.dataTransfer.getData("text");
  setState('currentWord', data);
  const category = event.target.closest(".category").dataset.activityCategory;

  playActivitySound('drop');
  placeWord(category);
  highlightBoxes(false);
};


export function checkSorting() {
  const feedbackElement = document.getElementById("feedback");
  const toast = document.getElementById("toast");
  const activityId = location.pathname
    .substring(location.pathname.lastIndexOf("/") + 1)
    .split(".")[0];

  let correctCount = 0;
  let incorrectCount = 0;
  let key = activityId + "-intentos";
  let intentCount = localStorage.getItem(key);
  if (intentCount === null) {
    localStorage.setItem(key, "0");
    intentCount = 0;
  } else {
    intentCount = parseInt(intentCount, 10);
  }

  intentCount++;
  localStorage.setItem(key, intentCount.toString()); 

  console.log("Starting validation check...");

  const categories = document.querySelectorAll('section .category');

  // Process all word placements first (unchanged code)
  categories.forEach(category => {
    const categoryType = category.getAttribute('data-activity-category');
    const placedWords = category.querySelectorAll('.placed-word');

    placedWords.forEach(placedWord => {
      const wordKey = placedWord.getAttribute('data-activity-item');
      const correctCategory = correctAnswers[wordKey];

      // Remove any existing validation marks
      const existingMark = placedWord.querySelector('.validation-mark');
      if (existingMark) {
        existingMark.remove();
      }

      // Create validation mark
      const mark = document.createElement('span');
      mark.classList.add(
        'validation-mark',
        'ml-2',  // margin left for spacing
        'inline-flex',
        'items-center',
        'text-lg'
      );

      if (categoryType === correctCategory) {
        console.log("✓ CORRECT placement");
        placedWord.classList.remove('bg-red-100', 'border-red-300');
        placedWord.classList.add('bg-green-100', 'border-green-300', 'border');
        mark.textContent = '✓';
        mark.classList.add('text-green-700');
        correctCount++;
      } else {
        console.log("✗ INCORRECT placement");
        placedWord.classList.remove('bg-green-100', 'border-green-300');
        placedWord.classList.add('bg-red-100', 'border-red-300', 'border');
        mark.textContent = '✗';
        mark.classList.add('text-red-700');
        incorrectCount++;
      }

      // Handle different card layouts based on content
      if (placedWord.querySelector('img')) {
        // Cards with images: Create structured layout
        let contentContainer = placedWord.querySelector('.content-container');
        if (!contentContainer) {
          contentContainer = document.createElement('div');
          contentContainer.classList.add(
            'content-container',
            'flex',
            'flex-col',
            'items-center',
            'w-full',
            'space-y-2'
          );

          // Move existing content into container
          while (placedWord.firstChild) {
            contentContainer.appendChild(placedWord.firstChild);
          }
          placedWord.appendChild(contentContainer);
        }

        // Create/update text wrapper
        let textWrapper = placedWord.querySelector('.text-wrapper');
        if (!textWrapper) {
          textWrapper = document.createElement('div');
          textWrapper.classList.add(
            'text-wrapper',
            'flex',
            'items-center',
            'justify-center'
          );

          // Move the text element into the wrapper
          const textElement = contentContainer.querySelector('.word-text, span:not(.validation-mark)');
          if (textElement) {
            textWrapper.appendChild(textElement);
          }
          contentContainer.appendChild(textWrapper);
        }

        // Add the mark to the text wrapper
        textWrapper.appendChild(mark);

      } else {
        // For text-only or text+icon cards: Simpler inline layout
        let textWrapper = placedWord.querySelector('.text-wrapper');
        if (!textWrapper) {
          textWrapper = document.createElement('div');
          textWrapper.classList.add(
            'text-wrapper',
            'flex',
            'items-center',
            'justify-center',
            'w-full'
          );

          // Move all existing content to the wrapper
          while (placedWord.firstChild) {
            textWrapper.appendChild(placedWord.firstChild);
          }
          placedWord.appendChild(textWrapper);
        }

        // Add the mark after the content
        textWrapper.appendChild(mark);
      }

      // Ensure proper spacing and layout
      placedWord.classList.add('p-2', 'rounded');
    });
  });

  const totalPlacedWords = document.querySelectorAll('section .placed-word').length;
  const totalWords = Object.keys(correctAnswers).length;
  const allWordsPlaced = totalPlacedWords === totalWords;
  const allCorrect = correctCount === totalWords;

  // Handle incomplete placement case with improved toast
  if (!allWordsPlaced) {
    const message = translateText("sorting-not-complete", { cardsPlaced: totalPlacedWords, totalCards: totalWords });

    // Update feedback element
    feedbackElement.textContent = message;
    feedbackElement.classList.remove("text-green-500");
    feedbackElement.classList.add("text-red-500");

    // Use updateSubmitButtonAndToast instead
    updateSubmitButtonAndToast(
      false,
      translateText("retry"),
      ActivityTypes.SORTING,
      totalWords - totalPlacedWords, // unfilledCount represents unplaced words here
      {
          message: message,
          emoji: '🤔', 
          toastType: 'warning',
          timeout: 6000,
          showCloseButton: true
      }
    );
    
    playActivitySound('error');
    
    // Add this line to update reset button visibility
    if (typeof updateResetButtonVisibility === 'function') {
      updateResetButtonVisibility();
    }
    
    return;
  }

  // Handle completed activity feedback with improved toast
  let feedbackMessage = translateText("sorting-results", { correctCount: correctCount, incorrectCount: incorrectCount });
  if (allCorrect) {
    // Success handling code (unchanged)
    playActivitySound('success');
    const activityId = location.pathname
      .substring(location.pathname.lastIndexOf("/") + 1)
      .split(".")[0];
    // Activity tracking code (unchanged)
    const storedActivities = localStorage.getItem("completedActivities");
    let completedActivities = storedActivities ? JSON.parse(storedActivities) : []; 
    const namePage = localStorage.getItem("namePage");
    const timeDone = new Date().toLocaleString("es-ES")
    const newActivityId = `${activityId}-${namePage}-${intentCount}-${timeDone}`;

    if (!completedActivities.includes(activityId)) {
      completedActivities.push(newActivityId);
      localStorage.setItem("completedActivities", JSON.stringify(completedActivities));
    }
    feedbackMessage = translateText("sorting-correct-answer");
    executeMail(ActivityTypes.SORTING);
  } else {
    playActivitySound('error');
    feedbackMessage = translateText("sorting-results", { correctCount: correctCount, incorrectCount: incorrectCount });
  }

  
  
  // Update feedback element
  feedbackElement.textContent = feedbackMessage;
  feedbackElement.classList.remove("text-red-500", "text-green-500");
  feedbackElement.classList.add(allCorrect ? "text-green-500" : "text-red-500");

  // Keep this final call to updateSubmitButtonAndToast which now handles all toast functionality
  updateSubmitButtonAndToast(
    allCorrect,
    allCorrect ? translateText("next-activity") : translateText("retry"),
    ActivityTypes.SORTING,
    0, // unfilledCount
    {
        message: feedbackMessage, // Custom message for this activity
        emoji: allCorrect ? '🎉' : '🤔',
        toastType: allCorrect ? 'success' : 'error', // Type of toast
        timeout: 6000, // Custom timeout
        showCloseButton: true // Show close button
    }
  );
}

const saveToLocalStorage = () => {

  const categories = document.querySelectorAll('[data-activity-category]');
  const data = {};

  categories.forEach(category => {
    const categoryName = category.getAttribute('data-activity-category');
    const words = [...category.querySelectorAll('.word-card')].map(word => word.dataset.activityItem);
    data[categoryName] = words;
  });

  localStorage.setItem(activity(), JSON.stringify(data));

};

// Modify loadFromLocalStorage to handle errors gracefully
const loadFromLocalStorage = () => {
  try {
    const savedDataRaw = localStorage.getItem(activity());
    if (!savedDataRaw) return;
    
    let savedData = {};
    try {
      savedData = JSON.parse(savedDataRaw);
    } catch (error) {
      console.error("Error parsing saved sorting data:", error);
      return;
    }
    
    if (!savedData || Object.keys(savedData).length === 0) return;
    
    Object.entries(savedData).forEach(([category, words]) => {
      const categoryDiv = document.querySelector(`div[data-activity-category="${category}"]`);
      if (!categoryDiv) return;
      
      if (Array.isArray(words)) {
        words.forEach(word => {
          const wordCard = document.querySelector(`.word-card[data-activity-item="${word}"]`);
          if (wordCard && state.currentWord !== word) {
            // Set current word temporarily
            const previousWord = state.currentWord;
            setState('currentWord', word);
            
            // Place the word silently (without sound)
            placeWordSilently(category);
            
            // Restore previous word
            setState('currentWord', previousWord);
          }
        });
      }
    });
  } catch (error) {
    console.error("Error loading sorting data:", error);
  }
};

// Add a silent version of placeWord that doesn't play sounds
const placeWordSilently = (category) => {
  if (!state.currentWord) return;
  
  const categoryDiv = document.querySelector(
    `div[data-activity-category="${category}"]`
  );
  const listElement = categoryDiv?.querySelector(".word-list");

  if (!listElement) return;

  const wordCard = document.querySelector(
    `.word-card[data-activity-item="${state.currentWord}"]`
  );
  if (!wordCard) return;

  // Place the word in the category
  const placedWordCard = handleWordPlacement(wordCard, listElement);
  
  // Reset selection state
  resetSelectionState();
  
  // Don't call saveToLocalStorage() here to prevent circular saves
};