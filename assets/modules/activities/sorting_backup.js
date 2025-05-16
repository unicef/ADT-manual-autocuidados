import { state, setState } from '../state.js';
import { playActivitySound } from '../audio.js';
import { ActivityTypes, updateSubmitButtonAndToast } from '../utils.js';
import { announceToScreenReader } from '../ui_utils.js';
import { translateText } from '../translations.js';
import { executeMail } from './send-email.js';

export const prepareSorting = (section) => {
  setupWordCards(section);
  setupCategories();
  setupFeedbackReset(section);
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
  if (document.getElementsByTagName("h2").length > 0) {
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
};

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
  const categories = document.querySelectorAll('.category');
  categories.forEach((category) => {
    category.setAttribute('tabindex', '0');
    category.addEventListener('dragover', allowDrop);
    category.addEventListener('drop', dropSort);

    category.addEventListener('click', (e) => {
      // Existing click handler code...
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
  const placedWordCards = document.querySelectorAll('.placed-word');
  placedWordCards.forEach((placedWordCard) => {
    placedWordCard.remove();
  });

  // Restore original word cards
  const originalWordCards = document.querySelectorAll('.word-card');
  originalWordCards.forEach((wordCard) => {
    restoreOriginalCard(wordCard);
  });

  // Reset state variables
  setState('currentWord', "");
  state.inCategoryNavigation = false;

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

  // Optionally, play a reset sound
  playActivitySound('reset');
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

  // Show reset button as soon as user starts dragging
  if (window.updateResetButtonVisibility) {
    window.updateResetButtonVisibility(true);
  }
};

export const highlightBoxes = (state) => {
  const categories = document.querySelectorAll(".category");
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

  document.querySelectorAll(".word-card")
    .forEach((card) => card.classList.remove("border-blue-700"));
  wordCard.classList.add("border-blue-700", "border-2", "box-border");

  setState('currentWord', wordCard.getAttribute("data-activity-item"));
  // Enable category navigation mode and focus first category
  state.inCategoryNavigation = true;
  const firstCategory = document.querySelector('.category');
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

  // Show reset button as soon as user selects a word
  if (window.updateResetButtonVisibility) {
    window.updateResetButtonVisibility(true);
  }
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

  let wordCard = document.querySelector(`.word-card[data-activity-item="${placedItemId}"]`);

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
    console.log("- Classes:", newWordCard.classList.toString());
    console.log("- Draggable:", newWordCard.getAttribute('draggable'));

    saveToLocalStorage();
  }

  playActivitySound('reset');
  console.log("=== removeWord function complete ===\n");
};

export const placeWord = (category) => {
  if (!state.currentWord) {
    console.log("No word selected.");
    return;
  }

  // Play the sound immediately
  playActivitySound('drop');

  const categoryDiv = document.querySelector(
    `div[data-activity-category="${category}"]`
  );

  // IMPORTANT: Temporarily remove aria-label from category to stop VoiceOver immediately
  const originalLabel = categoryDiv?.getAttribute('aria-label');
  categoryDiv?.removeAttribute('aria-label');

  const listElement = categoryDiv?.querySelector(".word-list");

  if (!listElement) {
    console.error(`Category "${category}" not found or no word list available.`);
     // Restore label if error
     if (originalLabel) categoryDiv.setAttribute('aria-label', originalLabel);
    return;
  }

  const wordCard = document.querySelector(
    `.word-card[data-activity-item="${state.currentWord}"]`
  );
  if (!wordCard) {
    console.error(`Word card for "${state.currentWord}" not found.`);
    // Restore label if error
    if (originalLabel) categoryDiv.setAttribute('aria-label', originalLabel);
    return;
  }

  // Place the word in the category
  const placedWordCard = handleWordPlacement(wordCard, listElement);
  
  // Get text values for announcement
  const currentWordText = wordCard.textContent.trim();
  const categoryName = categoryDiv.querySelector('label').textContent.trim();
  
  // Reset the selection state immediately to prevent duplication
  resetSelectionState();
  saveToLocalStorage();

  // Show reset button
  if (window.updateResetButtonVisibility) {
    window.updateResetButtonVisibility(true);
  }
  
  // NEW: Set role="alert" and aria-live directly on the placed card
  placedWordCard.setAttribute('role', 'alert');
  placedWordCard.setAttribute('aria-live', 'assertive');
  placedWordCard.setAttribute('aria-label', `${currentWordText} colocado en ${categoryName}. Presione Enter para quitar.`);
  
  // NEW: Move focus to the placed card 
  setTimeout(() => {
    placedWordCard.focus();
    
    // Restore category aria-label after a longer delay
    setTimeout(() => {
      if (originalLabel) categoryDiv.setAttribute('aria-label', originalLabel);
    }, 1500);
  }, 50);

  // Find the next available option
  const remainingWordCards = document.querySelectorAll(
    `.word-card:not(.bg-gray-300)`
  );
  
  if (remainingWordCards.length > 0) {
    const nextWordCard = remainingWordCards[0];
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
  categoryContainer.insertBefore(nextButton, categoryContainer.firstChild);
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
    'hover:bg-red-100',
    'bg-blue-50',
    'border-2',
    'border-blue-300',
    'rounded-md',
    'shadow-sm',
    'transition-all'
  );

  // Make the card focusable and provide screen reader feedback
  clonedCard.setAttribute('draggable', 'false');
  clonedCard.setAttribute('role', 'button'); 
  clonedCard.setAttribute('tabindex', '0'); // Make sure it's focusable
  
  clonedCard.addEventListener("click", function() {
    removeWord(this);
  });
  
  clonedCard.addEventListener("keydown", function(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
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

  const categories = document.querySelectorAll('.category');

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

    localStorage.setItem(activity() + "- correct", correctCount)
    localStorage.setItem(activity() + "- incorrect", incorrectCount)
  });

  const totalPlacedWords = document.querySelectorAll('.placed-word').length;
  const totalWords = Object.keys(correctAnswers).length;
  const allWordsPlaced = totalPlacedWords === totalWords;
  const allCorrect = correctCount === totalWords;

  // Handle incomplete placement case
  if (!allWordsPlaced) {
    const message = translateText("sorting-not-complete", { cardsPlaced: totalPlacedWords, totalCards: totalWords });
    // const message = `Please place all words in categories before submitting. (${totalPlacedWords}/${totalWords} words placed)`;

    // Update both feedback element and toast
    feedbackElement.textContent = message;
    feedbackElement.classList.remove("text-green-500");
    feedbackElement.classList.add("text-red-500");

    if (toast) {
      toast.textContent = message;
      toast.classList.remove("hidden", "bg-green-200", "text-green-700");
      toast.classList.add("bg-red-200", "text-red-700");

      // Hide toast after 3 seconds
      setTimeout(() => {
        toast.classList.add("hidden");
      }, 3000);
    }
    playActivitySound('error');


    return;
  }

  // Play appropriate sound and construct feedback message
  if (allCorrect) {
    // Reproducir sonido de éxito
    playActivitySound('success');

    // Obtener el ID de la actividad desde la URL
    const activityId = location.pathname
      .substring(location.pathname.lastIndexOf("/") + 1)
      .split(".")[0];

    // Recuperar el arreglo de actividades completadas del localStorage
    const storedActivities = localStorage.getItem("completedActivities");
    let completedActivities = storedActivities ? JSON.parse(storedActivities) : [];

    // Agregar el ID si aún no está en el arreglo
    if (!completedActivities.includes(activityId)) {
      completedActivities.push(activityId);
      localStorage.setItem("completedActivities", JSON.stringify(completedActivities));
    }

    // Enviar actividad por correo
    executeMail(ActivityTypes.SORTING);
  } else {
    playActivitySound('error');
  }

  //const feedbackMessage = `You have ${correctCount} correct answers and ${incorrectCount} incorrect answers.${allCorrect ? ' Great job!' : ' Try again!'}`;
  const feedbackMessage = translateText("sorting-results", { correctCount: correctCount, incorrectCount: incorrectCount });
  // Update both feedback element and toast with the result
  feedbackElement.textContent = feedbackMessage;
  feedbackElement.classList.remove("text-red-500", "text-green-500");
  feedbackElement.classList.add(allCorrect ? "text-green-500" : "text-red-500");

  if (toast) {
    toast.textContent = feedbackMessage;
    toast.classList.remove("hidden");
    toast.classList.remove("bg-red-200", "text-red-700", "bg-green-200", "text-green-700");
    toast.classList.add(
      allCorrect ? "bg-green-200" : "bg-red-200",
      allCorrect ? "text-green-700" : "text-red-700"
    );

    // Hide toast after 3 seconds
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 3000);
  }

  updateSubmitButtonAndToast(
    allCorrect,
    allCorrect ? translateText("next-activity") : translateText("retry"),
    ActivityTypes.SORTING
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


const loadFromLocalStorage = () => {
  const savedDataRaw = localStorage.getItem(activity());

  let savedData = {};
  if (savedDataRaw) {
    try {
      savedData = JSON.parse(savedDataRaw);
    } catch (error) {
      return;
    }
  }

  Object.entries(savedData).forEach(([category, words]) => {
    const categoryDiv = document.querySelector(`div[data-activity-category="${category}"]`);

    if (!categoryDiv) {
      return;
    }

    words.forEach(word => {

      const alreadyPlaced = categoryDiv.querySelector(`.placed-word[data-activity-item="${word}"]`);
      if (alreadyPlaced) {

        return;
      }

      setState('currentWord', word);

      placeWord(category);
    });
  });
  
};

loadFromLocalStorage();