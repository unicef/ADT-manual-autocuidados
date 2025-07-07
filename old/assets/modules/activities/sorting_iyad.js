import { state, setState } from '../state.js';
import { playActivitySound } from '../audio.js';
import { ActivityTypes, updateSubmitButtonAndToast } from '../utils.js';
import { announceToScreenReader } from '../ui_utils.js';
import { translateText } from '../translations.js';

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
    ///////////////////////////////////////
    category.setAttribute('role', 'listbox'); // ADD THIS
    /////////////////////////////////////////
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
      if (state.currentWord) {
        if (e.target.closest('.placed-word')) {
          e.stopPropagation();
          return; // Don't place a new word if clicking on an existing placed one
        }
        placeWord(category.getAttribute('data-activity-category'));
      }
    });

    category.addEventListener('keydown', (e) => {
      if (state.currentWord && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        placeWord(category.getAttribute('data-activity-category'));
      }
    });
  });
};

const setupFeedbackReset = () => {
  const feedback = document.querySelector("#feedback");
  if (feedback) {
    feedback.addEventListener("click", resetActivity);
  }
};

const resetActivity = () => {
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
  if (state.currentWord) {
    console.log("Cannot remove - currently in placement mode");
    return;
  }

  console.log("=== Starting removeWord function ===");
  
  // Get the placed card's text and data-activity-item
  const placedText = listItem.textContent.trim();
  const placedItemId = listItem.getAttribute('data-activity-item');
  
  console.log("Placed card details:");
  console.log("- Text:", placedText);
  console.log("- Item ID:", placedItemId);

  // Find the original disabled card at the bottom, excluding placed cards
  const wordCard = Array.from(document.querySelectorAll('.word-card:not(.placed-word)'))
    .find(card => card.getAttribute('data-activity-item') === placedItemId);

  if (wordCard) {
    console.log("\nFound original card in bottom row:");
    console.log("- Text:", wordCard.textContent.trim());
    console.log("- Current classes:", wordCard.classList.toString());
    console.log("- Is bottom card:", !wordCard.classList.contains('placed-word'));
    console.log("- Parent element:", wordCard.parentElement.tagName);
    
    console.log("\nRemoving disabled classes...");
    wordCard.classList.remove(
      "bg-gray-300",
      "cursor-not-allowed",
      "text-gray-400",
      "hover:bg-gray-300",
      "hover:scale-100"
    );
    
    console.log("\nAdding back active classes...");
    wordCard.classList.add(
      "bg-white",
      "cursor-pointer",
      "hover:bg-gray-100",
      "transform",
      "hover:scale-105"
    );

    console.log("Classes after update:", wordCard.classList.toString());

    // Clear any inline styles
    wordCard.style = '';
    
    console.log("\nRe-enabling dragging...");
    wordCard.setAttribute('draggable', 'true');
    console.log("Draggable attribute now:", wordCard.getAttribute('draggable'));

    console.log("\nRe-adding event listeners...");
    // Remove old listeners first
    const newClickHandler = () => selectWordSort(wordCard);
    wordCard.removeEventListener('click', newClickHandler);
    wordCard.addEventListener('click', newClickHandler);
    
    // Re-add drag handlers
    const dragStartHandler = (e) => handleDragStart(e);
    wordCard.removeEventListener('dragstart', dragStartHandler);
    wordCard.addEventListener('dragstart', dragStartHandler);

    const mouseDownHandler = () => highlightBoxes(true);
    const mouseUpHandler = () => highlightBoxes(false);
    wordCard.removeEventListener('mousedown', mouseDownHandler);
    wordCard.removeEventListener('mouseup', mouseUpHandler);
    wordCard.addEventListener('mousedown', mouseDownHandler);
    wordCard.addEventListener('mouseup', mouseUpHandler);

    console.log("\nFinal card state:");
    console.log("- Classes:", wordCard.classList.toString());
    console.log("- Draggable:", wordCard.getAttribute('draggable'));
    console.log("- Style:", wordCard.style.cssText);

    playActivitySound('reset');
  } else {
    console.error(`Could not find original card with id: ${placedItemId}`);
    console.log("All bottom word-cards:", 
      Array.from(document.querySelectorAll('.word-card:not(.placed-word)'))
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
  const listElement = categoryDiv?.querySelector(".word-list");

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

  handleWordPlacement(wordCard, listElement);
  resetSelectionState();

  //////////////////////////////////////////////
  // Focus the newly placed card
  const placed = listElement.lastElementChild;
  if (placed) {
    placed.focus();
    announceToScreenReader(`Placed ${placed.textContent.trim()} in ${categoryDiv.getAttribute("aria-label")}`);
  }
  /////////////////////////////////////////////
};

const handleWordPlacement = (wordCard, listElement) => {
  const clonedWordCard = wordCard.cloneNode(true);
  setupClonedCard(clonedWordCard);

  listElement.classList.add("flex", "flex-wrap");
  listElement.appendChild(clonedWordCard);

  disableOriginalCard(wordCard);
};

const setupClonedCard = (clonedCard) => {
  if (clonedCard.querySelector('img')) {
    setupImageCard(clonedCard);
  } else {
    setupTextCard(clonedCard);
  }

  clonedCard.classList.add(
    'placed-word',
    'max-w-40',
    'm-2',
    'p-2',
    'cursor-pointer',
    'hover:bg-gray-100'
  );

  clonedCard.setAttribute('draggable', 'false');
  /////////////////////////////////////// Newly Added
  clonedCard.setAttribute('tabindex', '0');
  clonedCard.setAttribute('role', 'option');
  clonedCard.setAttribute('aria-selected', 'false');
  ///////////////////////////////////////

  clonedCard.addEventListener("click", function () {
    removeWord(this);
  });
  clonedCard.addEventListener("keydown", function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      removeWord(this);
    }
  });
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
  let correctCount = 0;
  let incorrectCount = 0;

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
    playActivitySound('success');


    // Obtener el ID de la actividad desde la URL
    const activityId = location.pathname
      .substring(location.pathname.lastIndexOf("/") + 1)
      .split(".")[0];

    // Recuperar el arreglo de actividades completadas del localStorage
    // Recuperar el arreglo de actividades completadas del localStorage
    const storedActivities = localStorage.getItem("completedActivities");
    let completedActivities = storedActivities ? JSON.parse(storedActivities) : []; 

    const namePage = localStorage.getItem("namePage");
    const timeDone = new Date().toLocaleString("es-ES");
    const newActivityId = `${activityId}-${namePage}-${intentCount}-${timeDone}`;

    // Remover cualquier entrada anterior con el mismo activityId
    completedActivities = completedActivities.filter(id => !id.startsWith(`${activityId}-`));

    // Agregar la nueva entrada actualizada
    completedActivities.push(newActivityId);

    // Guardar en localStorage
    localStorage.setItem("completedActivities", JSON.stringify(completedActivities));

    // Enviar actividad por correo
    executeMail(ActivityTypes.SORTING);

  } else {
    playActivitySound('error');
  }

  //const feedbackMessage = `You have ${correctCount} correct answers and ${incorrectCount} incorrect answers.${allCorrect ? ' Great job!' : ' Try again!'}`;
  const feedbackMessage = translateText("sorting-results", {correctCount: correctCount, incorrectCount: incorrectCount});
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