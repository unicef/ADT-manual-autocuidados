import { setCookie, getCookie } from "./cookies.js";
import { cacheInterfaceElements, toggleSidebar } from "./interface.js";
import { trackNavigation } from "./analytics.js";

export const handleNavigation = (event) => {
  if (
    event.target.matches(".nav__list-link") ||
    event.target.id === "back-button" ||
    event.target.id === "forward-button"
  ) {
    event.preventDefault();
    const targetHref =
      event.target.href || event.target.getAttribute("data-href");

    if (!targetHref) {
      console.error(
        "Navigation target URL is null or undefined for element:",
        event.target
      );
      return;
    }

    // Cache current interface state
    cacheInterfaceElements();

    // Save current page state
    savePageState();

    const mainContent = document.querySelector('body > .container');
    if (mainContent) {
      mainContent.classList.add("opacity-0");
    }

    setTimeout(() => {
      window.location.href = targetHref;
    }, 150);
  }
};

export const savePageState = () => {
  const state = {
    sidebarState: getCookie("sidebarState"),
    scrollPosition: window.scrollY,
    navScrollPosition: document.querySelector(".nav__list")?.scrollTop || 0,
  };

  sessionStorage.setItem("pageState", JSON.stringify(state));
};

export const restorePageState = () => {
  try {
    const savedState = sessionStorage.getItem("pageState");
    if (!savedState) return;

    const state = JSON.parse(savedState);

    // Restore scroll positions
    setTimeout(() => {
      window.scrollTo(0, state.scrollPosition);
      const navList = document.querySelector(".nav__list");
      if (navList) {
        navList.scrollTop = state.navScrollPosition;
      }
    }, 100);
  } catch (error) {
    console.error("Error restoring page state:", error);
  }
};

export const setNavState = (state) => {
  const navToggle = document.querySelector(".nav__toggle");
  const navList = document.querySelector(".nav__list");
  const navLinks = document.querySelectorAll(".nav__list-link");
  const navPopup = document.getElementById("navPopup");
  const basePath = window.location.pathname.substring(
    0,
    window.location.pathname.lastIndexOf("/") + 1
  );

  if (!navList || !navToggle || !navLinks || !navPopup) {
    return;
  }
  // const isNavOpen = !navList.hasAttribute("hidden");
  const navState = state;
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  console.log("setNav - Nav is open:", navState);

  setNavToggle(navState, navList, navToggle, basePath);
  setNavPopupState(navPopup, navState);
  handleActiveLink(navState, currentPath, navLinks, navList);
};

const setNavToggle = (navState, navList, navToggle, basePath) => {
  if (!navState) {
    const scrollPosition = navList.scrollTop;
    setCookie("navScrollPosition", scrollPosition, 7, basePath);
    navToggle.setAttribute("aria-expanded", "false");
    navList.setAttribute("hidden", "true");
    setCookie("navState", "closed", 7, basePath);
  } else {
    navToggle.setAttribute("aria-expanded", "true");
    navList.removeAttribute("hidden");
    setCookie("navState", "open", 7, basePath);

    const savedPosition = getCookie("navScrollPosition");
    if (savedPosition) {
      navList.scrollTop = parseInt(savedPosition);
    }
  }
};

export const setNavPopupState = (navPopup, state) => {
  if (!state) {
    navPopup.classList.add("-translate-x-full");
    navPopup.setAttribute("aria-expanded", "false");
    navPopup.setAttribute("inert", "");
    navPopup.classList.remove("left-2");
  } else {
    navPopup.classList.remove("-translate-x-full");
    navPopup.setAttribute("aria-expanded", "true");
    navPopup.removeAttribute("inert");
    navPopup.classList.add("left-2");
  }
};

export const toggleNav = () => {
  const navToggle = document.querySelector(".nav__toggle");
  const navList = document.querySelector(".nav__list");
  const navLinks = document.querySelectorAll(".nav__list-link");
  const navPopup = document.getElementById("navPopup");
  const basePath = window.location.pathname.substring(
    0,
    window.location.pathname.lastIndexOf("/") + 1
  );

  if (!navList || !navToggle || !navLinks || !navPopup) {
    return;
  }
  const isNavOpen = !navList.hasAttribute("hidden");
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  console.log("toggleNav - Nav is open:", isNavOpen);

  handleNavToggle(isNavOpen, navList, navToggle, basePath);
  updateNavPopupState(navPopup);
  handleActiveLink(!isNavOpen, currentPath, navLinks, navList);
};

const handleNavToggle = (isNavOpen, navList, navToggle, basePath) => {
  if (isNavOpen) {
    const scrollPosition = navList.scrollTop;
    setCookie("navScrollPosition", scrollPosition, 7, basePath);
    navToggle.setAttribute("aria-expanded", "false");
    navList.setAttribute("hidden", "true");
    setCookie("navState", "closed", 7, basePath);
  } else {
    navToggle.setAttribute("aria-expanded", "true");
    navList.removeAttribute("hidden");
    setCookie("navState", "open", 7, basePath);

    const savedPosition = getCookie("navScrollPosition");
    if (savedPosition) {
      navList.scrollTop = parseInt(savedPosition);
    }
  }
};

const handleActiveLink = (isNavOpen, currentPath, navLinks, navList) => {
  if (!isNavOpen) return;

  const activeLink = Array.from(navLinks).find(
    (link) => link.getAttribute("href") === currentPath
  );

  if (activeLink) {
    activeLink.setAttribute("tabindex", "0");

    setTimeout(() => {
      const linkRect = activeLink.getBoundingClientRect();
      const navRect = navList.getBoundingClientRect();
      const isInView =
        linkRect.top >= navRect.top && linkRect.bottom <= navRect.bottom;

      if (!isInView) {
        activeLink.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      activeLink.focus({ preventScroll: true });
    }, 100);
  }
};

export const updateNavPopupState = (navPopup) => {
  const isHidden = navPopup.classList.toggle("-translate-x-full");
  navPopup.setAttribute("aria-expanded", !isHidden ? "true" : "false");
  if (isHidden) {
    navPopup.setAttribute("inert", "");
  } else {
    navPopup.removeAttribute("inert");
  }
  navPopup.classList.toggle("left-2");
};

export const nextPage = () => {
  const currentHref = window.location.href.split("/").pop() || "index.html";
  console.log("Current page:", currentHref); // Debug log

  // Get all nav links in order
  const navItems = Array.from(document.querySelectorAll(".nav__list-link"));
  console.log(
    "Available nav items:",
    navItems.map((item) => item.getAttribute("href"))
  ); // Debug log

  // Find current page index
  const currentIndex = navItems.findIndex(
    (item) => item.getAttribute("href") === currentHref
  );
  console.log("Current index:", currentIndex); // Debug log

  if (currentIndex >= 0 && currentIndex < navItems.length - 1) {
    const navList = document.querySelector(".nav__list");
    const scrollPosition = navList?.scrollTop || 0;
    const basePath = window.location.pathname.substring(
      0,
      window.location.pathname.lastIndexOf("/") + 1
    );

    // Save scroll position
    setCookie("navScrollPosition", scrollPosition, 7, basePath);

    // Cache interface state
    cacheInterfaceElements();

    // Fade out content
    const mainContent = document.querySelector('body > .container');
    if (mainContent) {
      mainContent.classList.add("opacity-0");
    }

    // Navigate to next page
    const nextPage = navItems[currentIndex + 1].getAttribute("href");
    const nextPageId = nextPage.split('/').pop();
    trackNavigation(currentHref, nextPageId);
    console.log("Navigating to:", nextPage); // Debug log

    setTimeout(() => {
      window.location.href = nextPage;
    }, 150);
  }
};

// Similarly update previousPage for consistency
export const previousPage = () => {
  const currentHref = window.location.href.split("/").pop() || "index.html";
  const navItems = Array.from(document.querySelectorAll(".nav__list-link"));
  const currentIndex = navItems.findIndex(
    (item) => item.getAttribute("href") === currentHref
  );

  if (currentIndex > 0) {
    const navList = document.querySelector(".nav__list");
    const scrollPosition = navList?.scrollTop || 0;
    const basePath = window.location.pathname.substring(
      0,
      window.location.pathname.lastIndexOf("/") + 1
    );

    setCookie("navScrollPosition", scrollPosition, 7, basePath);
    cacheInterfaceElements();

    const mainContent = document.querySelector('body > .container');
    if (mainContent) {
      mainContent.classList.add("opacity-0");
    }

    const prevPage = navItems[currentIndex - 1].getAttribute("href");
    const nextPageId = prevPage.split('/').pop().split('.')[0];
    trackNavigation(currentHref, nextPageId);

    setTimeout(() => {
      window.location.href = prevPage;
    }, 150);
  }
};
// Handle keyboard events for navigation
export function handleKeyboardShortcuts(event) {
  console.log("handleKeyboardShortcuts called with key:", event.key);

  const activeElement = document.activeElement;
  console.log(
    "Active element:",
    activeElement.tagName,
    "ID:",
    activeElement.id
  );

  // More specific check for text input elements
  const isInTextBox =
    (activeElement.tagName === "INPUT" &&
      activeElement.type !== "checkbox" &&
      activeElement.type !== "radio") ||
    activeElement.tagName === "TEXTAREA" ||
    activeElement.isContentEditable;

  // Check if any modifier keys are pressed (except Alt+Shift)
  const hasModifiers =
    event.ctrlKey || event.metaKey || (event.altKey && !event.shiftKey);

  console.log("isInTextBox:", isInTextBox, "hasModifiers:", hasModifiers);

  // Exit if in text input (but not checkbox/radio) or if unwanted modifier keys are pressed
  if (
    (isInTextBox && !activeElement.id.startsWith("toggle-")) ||
    hasModifiers
  ) {
    console.log("Exiting early due to text input or modifiers");
    return;
  }

  // Get toggle states
  const readAloudMode = getCookie("readAloudMode") === "true";
  const easyReadMode = getCookie("easyReadMode") === "true";
  const eli5Mode = getCookie("eli5Mode") === "true";

  console.log(
    "Current modes - readAloud:",
    readAloudMode,
    "easyRead:",
    easyReadMode,
    "eli5:",
    eli5Mode
  );

  // Handle navigation keys with null checks
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    console.log(`${event.key} pressed - handling navigation`);
    event.preventDefault();

    // Check if navigation is possible before proceeding
    const navItems = document.querySelectorAll(".nav__list-link");
    if (!navItems.length) return;

    if (event.key === "ArrowRight") {
      nextPage();
    } else {
      previousPage();
    }
    return;
  }

  switch (event.key) {
    case "x":
      console.log("X key pressed - toggling nav");
      event.preventDefault();
      toggleNav();
      break;
    case "a":
      console.log("A key pressed - toggling sidebar");
      event.preventDefault();
      toggleSidebar();
      break;
    case "Escape":
      console.log("Escape key pressed - closing nav");
      event.preventDefault();
      escapeKeyPressed();
      break;
  }

  // Handle Alt+Shift shortcuts separately
  if (event.altKey && event.shiftKey) {
    console.log("Alt+Shift modifier detected");
    switch (event.key) {
      case "x":
        console.log("Alt+Shift+X pressed - toggling nav");
        event.preventDefault();
        toggleNav();
        break;
      case "a":
        console.log("Alt+Shift+A pressed - toggling sidebar");
        event.preventDefault();
        toggleSidebar();
        break;
    }
  }
}

const escapeKeyPressed = () => {
  const navPopup = document.getElementById("navPopup");
  const sidebar = document.getElementById("sidebar");
  const content = document.querySelector("body > .container");
  
  // Check if nav is open
  if (!navPopup.classList.contains('-translate-x-full')) {
    // Close nav
    toggleNav();
  }
  // Check if sidebar is open
  else if (!sidebar.classList.contains('translate-x-full')) {
    toggleSidebar();
    // Focus is handled within toggleSidebar now
  }
  // Move focus to main content
  if (content) {
    content.setAttribute("tabindex", "-1");
    content.focus();
  }
};

/**
 * Handle clicks outside of menus to close them
 * This improves usability by allowing users to dismiss menus by clicking elsewhere
 */
export const setupClickOutsideHandler = () => {
  document.addEventListener('click', (event) => {
    const navPopup = document.getElementById('navPopup');
    const sidebar = document.getElementById('sidebar');
    const navToggle = document.querySelector('.nav__toggle');
    const sidebarToggle = document.getElementById('open-sidebar');
    const content = document.querySelector('body > .container');
    
    // Check if nav menu is open
    const isNavOpen = navPopup && !navPopup.classList.contains('-translate-x-full');
    
    // Check if sidebar is open
    const isSidebarOpen = sidebar && !sidebar.classList.contains('translate-x-full');
    
    // If neither menu is open, no action needed
    if (!isNavOpen && !isSidebarOpen) {
      return;
    }
    
    // Check if click is outside the navigation menu
    const clickedOutsideNav = isNavOpen && 
      !navPopup.contains(event.target) && 
      (!navToggle || !navToggle.contains(event.target));
    
    // Check if click is outside the sidebar
    const clickedOutsideSidebar = isSidebarOpen && 
      !sidebar.contains(event.target) && 
      (!sidebarToggle || !sidebarToggle.contains(event.target));
    
    // Close navigation if clicked outside
    if (clickedOutsideNav) {
      toggleNav();
    }
    
    // Close sidebar if clicked outside
    if (clickedOutsideSidebar) {
      toggleSidebar();
    }
    
    // Focus main content if a menu was closed
    if ((clickedOutsideNav || clickedOutsideSidebar) && content) {
      content.setAttribute('tabindex', '-1');
      content.focus();
      
      // Announce to screen readers (if your announceToScreenReader function is available)
      try {
        const { announceToScreenReader } = require('./ui_utils.js');
        announceToScreenReader('Menú cerrado');
      } catch (e) {
        // Function not available, continue silently
      }
    }
  });
};