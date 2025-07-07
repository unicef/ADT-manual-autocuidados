/**
 * Dynamically loads the Atkinson Hyperlegible font and applies it to the document
 */
export const loadAtkinsonFont = () => {
   // Create and load the preconnect links
   const gFontsPreconnect = document.createElement('link');
   gFontsPreconnect.rel = 'preconnect';
   gFontsPreconnect.href = 'https://fonts.googleapis.com';
   
   const gStaticPreconnect = document.createElement('link');
   gStaticPreconnect.rel = 'preconnect';
   gStaticPreconnect.href = 'https://fonts.gstatic.com';
   gStaticPreconnect.crossOrigin = 'anonymous';
   
   // Create and load the font stylesheet
   const fontStylesheet = document.createElement('link');
   fontStylesheet.rel = 'stylesheet';
   fontStylesheet.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap';
   
   // Append elements to document head
   document.head.appendChild(gFontsPreconnect);
   document.head.appendChild(gStaticPreconnect);
   document.head.appendChild(fontStylesheet);
   
   // Apply the font to the entire document
   document.documentElement.style.fontFamily = '"Atkinson Hyperlegible", sans-serif';
   
   // Also apply to all elements that might inherit from a different font
   const styleSheet = document.createElement('style');
   styleSheet.textContent = `
       body, p, h1, h2, h3, h4, h5, h6, span, div, button, input, textarea, select {
           font-family: "Atkinson Hyperlegible", sans-serif !important;
       }
   `;
   document.head.appendChild(styleSheet);
};