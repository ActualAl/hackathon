// vimeo-captions-checker.js
// Usage: node vimeo-captions-checker.js <vimeo-url>
//
// Setup:
//   npm init -y
//   npm install playwright
//   npx playwright install chromium

const { chromium } = require('playwright');

async function getCaptionLanguages(url, debug = false) {
  const browser = await chromium.launch({ headless: !debug });
  const page = await browser.newPage();

  try {
    // Navigate to the video
    await page.goto(url, { waitUntil: 'networkidle' });

    // Handle cookie consent dialog if present
    try {
      const acceptButton = await page.waitForSelector(
        'button:has-text("Accept"), button:has-text("I Accept")',
        { timeout: 3000 }
      );
      await acceptButton.click();
      await page.waitForTimeout(1000);
    } catch {
      // No consent dialog, continue
    }

    // Wait for player controls to be available
    await page.waitForTimeout(2000);

    // Debug screenshot
    if (debug) {
      await page.screenshot({ path: 'vimeo-debug-1.png' });
      console.log('Screenshot 1 saved');
    }

    // Click the Settings gear button
    const settingsButton = await page.waitForSelector(
      'button[aria-label="Settings"]',
      { timeout: 10000 }
    );
    await settingsButton.click();
    await page.waitForTimeout(500);

    if (debug) {
      await page.screenshot({ path: 'vimeo-debug-2.png' });
      console.log('Screenshot 2 saved (settings menu)');
    }

    // Click on CC/subtitles menu item
    const ccMenuItem = await page.waitForSelector(
      'text=CC/subtitles',
      { timeout: 5000 }
    ).catch(() => null);

    if (!ccMenuItem) {
      console.log('No CC/subtitles option found in settings menu');
      await browser.close();
      return [];
    }

    await ccMenuItem.click();
    await page.waitForTimeout(500);

    if (debug) {
      await page.screenshot({ path: 'vimeo-debug-3.png' });
      console.log('Screenshot 3 saved (subtitles submenu)');
    }

    // Extract language options from the submenu
    // Look for menuitemradio elements which contain the language options
    const languages = await page.$$eval(
      '[role="menuitemradio"]',
      (items) => {
        return items
          .map(el => el.textContent.trim())
          .filter(text =>
            text.toLowerCase() !== 'off' &&
            text.toLowerCase() !== 'customize' &&
            text.length > 0
          );
      }
    );

    await browser.close();
    return languages;

  } catch (error) {
    console.error('Error:', error.message);

    // Save debug screenshot on error
    try {
      await page.screenshot({ path: 'vimeo-error.png' });
      console.log('Error screenshot saved to vimeo-error.png');
    } catch {}

    await browser.close();
    return [];
  }
}

// Main
const args = process.argv.slice(2);
const debug = args.includes('--debug');
const url = args.find(arg => !arg.startsWith('--'));

if (!url) {
  console.log('Usage: node vimeo-captions-checker.js <vimeo-url> [--debug]');
  console.log('  --debug: Run with visible browser window and save screenshots');
  process.exit(1);
}

getCaptionLanguages(url, debug).then(languages => {
  console.log(`\nCaption languages found: ${languages.length}`);
  if (languages.length > 0) {
    console.log('Languages:');
    languages.forEach(lang => console.log(`  - ${lang}`));
  }
});
