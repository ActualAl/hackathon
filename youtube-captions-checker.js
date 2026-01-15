// youtube-captions-checker.js
// Usage: node youtube-captions-checker.js <youtube-url>
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
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Handle cookie consent dialog if present
    try {
      const rejectButton = await page.waitForSelector(
        'button:has-text("Reject all"), button:has-text("Reject the use of cookies")',
        { timeout: 5000 }
      );
      await rejectButton.click();
      await page.waitForTimeout(1000);
    } catch {
      // No consent dialog, continue
    }

    // Wait for video player to load
    await page.waitForSelector('video', { timeout: 10000 });

    // Debug: take screenshot to see page state
    await page.screenshot({ path: 'debug-before-click.png' });
    console.log('Screenshot saved to debug-before-click.png');

    // Wait for settings button to be available and click it directly
    const settingsButton = await page.waitForSelector('button.ytp-settings-button', { timeout: 10000 });
    await settingsButton.click({ force: true });

    // Wait for menu and click on Subtitles/CC option
    await page.waitForSelector('.ytp-settings-menu', { state: 'visible' });

    // Look for subtitles menu item
    const subtitlesItem = await page.$('text=Subtitles/CC');

    if (!subtitlesItem) {
      console.log('No subtitles available for this video');
      await browser.close();
      return [];
    }

    await subtitlesItem.click();

    // Wait for submenu to appear
    await page.waitForTimeout(500);

    // Extract all language options (excluding "Off" and "Auto-translate")
    const languages = await page.$$eval('.ytp-menuitem-label', (labels) => {
      return labels
        .map(el => el.textContent.trim())
        .filter(text =>
          text !== 'Off' &&
          !text.includes('Auto-translate') &&
          text.length > 0
        );
    });

    await browser.close();
    return languages;

  } catch (error) {
    console.error('Error:', error.message);
    await browser.close();
    return [];
  }
}

// Main
const args = process.argv.slice(2);
const debug = args.includes('--debug');
const url = args.find(arg => !arg.startsWith('--'));

if (!url) {
  console.log('Usage: node youtube-captions-checker.js <youtube-url> [--debug]');
  console.log('  --debug: Run with visible browser window');
  process.exit(1);
}

getCaptionLanguages(url, debug).then(languages => {
  console.log(`\nCaption languages found: ${languages.length}`);
  if (languages.length > 0) {
    console.log('Languages:');
    languages.forEach(lang => console.log(`  - ${lang}`));
  }
});
