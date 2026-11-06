// Helper utility to safely sanitize DOM elements and modern CSS for html2canvas
export function sanitizeClonedDocumentForHtml2Canvas(clonedDoc: Document): void {
  // 1. Remove all external stylesheets that html2canvas tries to parse, or sanitize rules
  try {
    for (let i = clonedDoc.styleSheets.length - 1; i >= 0; i--) {
      const sheet = clonedDoc.styleSheets[i];
      try {
        if (!sheet.cssRules) continue;
      } catch {
        // Cross origin stylesheet - remove to prevent security exceptions in html2canvas
        if (sheet.ownerNode && sheet.ownerNode.parentNode) {
          sheet.ownerNode.parentNode.removeChild(sheet.ownerNode);
        }
      }
    }
  } catch {
    // Ignore stylesheet sweep error
  }

  // 2. Normalize and ensure transparent background on cloned html & body
  try {
    if (clonedDoc.documentElement) {
      clonedDoc.documentElement.style.backgroundColor = 'transparent';
    }
    if (clonedDoc.body) {
      clonedDoc.body.style.backgroundColor = 'transparent';
    }
  } catch {
    // Ignore body styling error
  }
}
