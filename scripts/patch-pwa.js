const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');
const manifestSrc = path.join(__dirname, '..', 'web', 'manifest.json');
const manifestDest = path.join(distPath, 'manifest.json');
const iconSrc = path.join(__dirname, '..', 'assets/icons/mycollection/png/app_icon.png');
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
  // Replace old favicon references with icon.png
  html = html.replace(/<link rel="shortcut icon" href="\/favicon\.ico"[^>]*>/g, '<link rel="shortcut icon" href="/icon.png" type="image/png" />');

  // Add PWA Meta Tags + AdSense
  const pwaTags = `
    <title>PlanWitch</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="PlanWitch">
    <meta name="theme-color" content="#000000">
    <meta name="description" content="Premium Travel Companion & Budget Tracker">
    <link rel="manifest" href="/manifest.json">
    <link rel="apple-touch-icon" href="/icon.png">
    <link rel="shortcut icon" href="/icon.png" type="image/png" />
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1266748452983907" crossorigin="anonymous"></script>`;

  // Insert tags at the beginning of head
  html = html.replace('<head>', '<head>' + pwaTags);

  // Fix Background Colors and Safe Area
  html = html.replace(/html,\s*body\s*{[^}]+}/g, `html, body {
        height: 100dvh !important;
        background-color: #000000 !important;
        margin: 0 !important;
        padding: 0 !important;
        padding-bottom: 0 !important;
        padding-bottom: env(safe-area-inset-bottom, 0px) !important; /* Override safe area */
        overscroll-behavior: none !important;
        -webkit-tap-highlight-color: transparent;
      }`);

  html = html.replace(/#root\s*{[^}]+}/g, `#root {
        display: flex;
        height: 100dvh !important;
        flex: 1;
        background-color: #000000 !important;
        padding-bottom: 0 !important;
      }`);

  // Ensure the background color is also set on the html/body if not found by regex
  // Also add a style to force remove safe area
  if (!html.includes('background-color: #000000 !important')) {
    html = html.replace('</style>', `
      html, body, #root {
        background-color: #000000 !important;
        padding-bottom: 0 !important;
      }
      /* Force remove safe area inset */
      @supports (padding-bottom: env(safe-area-inset-bottom)) {
        html, body, #root {
          padding-bottom: 0 !important;
        }
      }
    </style>`);
  }

  // 3b. Inject a branded loading splash so users don't stare at a blank
  // black screen while the (large) JS bundle downloads. Expo replaces the
  // contents of #root on mount, so this disappears automatically once the
  // app is ready — no JS wiring required.
  const splashStyles = `
    <style id="pw-splash-style">
      @keyframes pw-spin { to { transform: rotate(360deg); } }
      @keyframes pw-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
      #pw-splash {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 22px;
        background: radial-gradient(120% 120% at 50% 0%, #14110d 0%, #000000 60%);
        z-index: 9999;
      }
      #pw-splash img {
        width: 88px;
        height: 88px;
        border-radius: 22px;
        animation: pw-pulse 1.8s ease-in-out infinite;
      }
      #pw-splash .pw-name {
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 26px;
        font-weight: 800;
        letter-spacing: 0.5px;
      }
      #pw-splash .pw-ring {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 3px solid rgba(255, 210, 173, 0.2);
        border-top-color: #FFD2AD;
        animation: pw-spin 0.9s linear infinite;
      }
    </style>`;
  const splashMarkup = `<div id="pw-splash">
      <img src="/icon.png" alt="PlanWitch" />
      <div class="pw-name">PlanWitch</div>
      <div class="pw-ring"></div>
    </div>`;

  if (!html.includes('id="pw-splash"')) {
    html = html.replace('</head>', splashStyles + '\n  </head>');
    html = html.replace('<div id="root"></div>', '<div id="root">' + splashMarkup + '</div>');
  }

  fs.writeFileSync(indexPath, html);
  console.log('✅ index.html patched with PWA tags, dark background, and loading splash');
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
