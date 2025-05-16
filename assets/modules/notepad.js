import { setCookie, getCookie } from "./cookies.js";
import { state } from "./state.js";

// Add these new functions at the end of the file (before the exports)
export const toggleNotepad = () => {
  const notepadContent = document.getElementById("notepad-content");
  const notepadButton = document.getElementById("notepad-button");

  if (notepadContent) {
    const isVisible = !notepadContent.classList.contains("hidden");

    if (isVisible) {
      state.notepadOpen = false; // Update state to indicate notepad is closed
      setCookie("notepadOpen", "false", 30); // Set cookie to indicate notepad is closed
      // Hide notepad
      notepadContent.classList.add("hidden");
      notepadButton.setAttribute("aria-expanded", "false");

      // Save notes when closing
      saveNotes();
    } else {
      state.notepadOpen = true; // Update state to indicate notepad is closed
      setCookie("notepadOpen", "true", 30); // Set cookie to indicate notepad is closed
      // Show notepad
      notepadContent.classList.remove("hidden");
      notepadButton.setAttribute("aria-expanded", "true");

      // Focus the textarea
      const textarea = document.getElementById("notepad-textarea");
      if (textarea) {
        setTimeout(() => textarea.focus(), 100);
      }

      // Load notes
      loadSavedNotes();
    }
  }
}

export const saveNotes = () => {
  const textarea = document.getElementById("notepad-textarea");
  const saveStatus = document.getElementById("notepad-save-status");

  if (textarea) {
    // Save to localStorage
    localStorage.setItem("user_notepad", textarea.value);

    // Show save confirmation
    if (saveStatus) {
      saveStatus.textContent = "Notes saved";
      saveStatus.classList.remove("opacity-0");
      saveStatus.classList.add("opacity-100");

      // Hide confirmation after 2 seconds
      setTimeout(() => {
        saveStatus.classList.remove("opacity-100");
        saveStatus.classList.add("opacity-0");
      }, 2000);
    }
  }
}

export const loadSavedNotes = () => {
  const textarea = document.getElementById("notepad-textarea");

  if (textarea) {
    const savedNotes = localStorage.getItem("user_notepad");
    if (savedNotes !== null) {
      textarea.value = savedNotes;
    }
  }
}

export const loadNotePad = () => {
  const notepadOpen = getCookie("notepadOpen") == "true";
  if (notepadOpen) {
    toggleNotepad();
  }
}