const fs = require('fs');
const path = require('path');

function patchHtml2Canvas() {
  const files = [
    path.join(__dirname, 'node_modules/html2canvas/dist/html2canvas.esm.js'),
    path.join(__dirname, 'node_modules/html2canvas/dist/html2canvas.js'),
    path.join(__dirname, 'node_modules/html2canvas/dist/html2canvas.min.js')
  ];

  files.forEach((file) => {
    if (!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf8');
    const regex = /if\s*\(\s*typeof\s+colorFunction\s*===\s*['"]undefined['"]\s*\)\s*\{\s*throw\s+new\s+Error\s*\([^)]*unsupported color function[^)]*\)\s*;\s*\}/g;
    if (regex.test(code)) {
      code = code.replace(regex, 'if (typeof colorFunction === "undefined") { return 0; }');
      fs.writeFileSync(file, code, 'utf8');
      console.log('Successfully patched html2canvas color handler in:', file);
    } else {
      console.log('No patch needed or already patched in:', file);
    }
  });
}

patchHtml2Canvas();

