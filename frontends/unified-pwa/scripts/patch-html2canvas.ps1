param()

$files = @(
    "frontends/unified-pwa/node_modules/html2canvas/dist/html2canvas.esm.js",
    "frontends/unified-pwa/node_modules/html2canvas/dist/html2canvas.js",
    "frontends/unified-pwa/node_modules/html2canvas/dist/html2canvas.min.js"
)

$pattern = 'if\s*\(\s*typeof\s+colorFunction\s*===\s*[\x27\x22]undefined[\x27\x22]\s*\)\s*\{\s*throw\s+new\s+Error\s*\([^\)]*unsupported color function[^\)]*\)\s*;\s*\}'
$replacement = 'if (typeof colorFunction === "undefined") { return 0; }'

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = [System.IO.File]::ReadAllText((Resolve-Path $file).Path)
        if ($content -match $pattern) {
            $newContent = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, $replacement)
            [System.IO.File]::WriteAllText((Resolve-Path $file).Path, $newContent, [System.Text.Encoding]::UTF8)
            Write-Host "Successfully patched: $file"
        } else {
            Write-Host "Pattern already patched or not found in: $file"
        }
    }
}

