const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');
const manifestSrc = path.join(__dirname, '..', 'web', 'manifest.json');
const manifestDest = path.join(distPath, 'manifest.json');
const iconSrc = path.join(__dirname, '..', 'assets/icons/mycollection/png/icon_1024.png');
const iconDest = path.join(distPath, 'icon.png');

// 1. Copy Manifest
if (fs.existsSync(manifestSrc)) {
    fs.copyFileSync(manifestSrc, manifestDest);
    console.log('✅ manifest.json copied to dist/');
}

// 2. Copy Icon
if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, iconDest);
    console.log('✅ icon.png copied to dist/');
}

// 3. Patch index.html
if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf8');

    // Remove any existing viewport, title, or apple tags to avoid duplicates
    html = html.replace(/<meta name="viewport"[^>]*>/g, '');
    html = html.replace(/<meta name="apple-mobile-web-app-[^>]*>/g, '');
    html = html.replace(/<link rel="apple-touch-icon"[^>]*>/g, '');
    html = html.replace(/<link rel="manifest"[^>]*>/g, '');
    html = html.replace(/<title>[^<]*<\/title>/g, '');

    // Add PWA Meta Tags
    const pwaTags = `
    <title>RouteMate</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="RouteMate">
    <meta name="theme-color" content="#0D0D0D">
    <link rel="manifest" href="/manifest.json">
    <link rel="apple-touch-icon" href="/icon.png">`;

    // Insert tags at the beginning of head
    html = html.replace('<head>', '<head>' + pwaTags);

    // Fix Background Colors
    html = html.replace(/html,\s*body\s*{[^}]+}/g, `html, body {
        height: 100% !important;
        background-color: #0D0D0D !important;
        margin: 0 !important;
        overscroll-behavior: none !important;
        -webkit-tap-highlight-color: transparent;
      }`);

    html = html.replace(/#root\s*{[^}]+}/g, `#root {
        display: flex;
        height: 100% !important;
        flex: 1;
        background-color: #0D0D0D !important;
      }`);

    // Ensure the background color is also set on the html/body if not found by regex
    if (!html.includes('background-color: #0D0D0D !important')) {
        html = html.replace('</style>', `
      html, body, #root {
        background-color: #0D0D0D !important;
      }
    </style>`);
    }

    fs.writeFileSync(indexPath, html);
    console.log('✅ index.html patched with PWA tags and dark background');
}

// 4. Update manifest.json to use icon.png
if (fs.existsSync(manifestDest)) {
    let manifest = JSON.parse(fs.readFileSync(manifestDest, 'utf8'));
    manifest.icons = [
        {
            "src": "/icon.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "/icon.png",
            "sizes": "512x512",
            "type": "image/png"
        },
        {
            "src": "/icon.png",
            "sizes": "1024x1024",
            "type": "image/png",
            "purpose": "any maskable"
        }
    ];
    fs.writeFileSync(manifestDest, JSON.stringify(manifest, null, 2));
    console.log('✅ manifest.json updated with /icon.png');
}
