const puppeteer = require('puppeteer');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000/en';

async function clickButtonByText(page, text) {
  const clicked = await page.evaluate((buttonText) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const target = buttons.find((button) => button.textContent && button.textContent.trim().includes(buttonText));
    if (!target) return false;
    target.click();
    return true;
  }, text);
  return clicked;
}

async function waitForConsentBanner(page) {
  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i += 1) {
    const visible = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).some(
        (button) =>
          button.textContent &&
          (button.textContent.includes('Tümünü Kabul Et') ||
            button.textContent.includes('Sadece Zorunlu')),
      );
    });

    if (visible) return true;
    await delay(250);
  }

  return false;
}

async function collectState(page, label) {
  return page.evaluate((scenarioLabel) => {
    const raw = localStorage.getItem('cookie-consent');
    let parsed = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = { parseError: true, raw };
    }

    const adElements = Array.from(document.querySelectorAll('ins.adsbygoogle'));
    const adScripts = Array.from(document.querySelectorAll('script[src*="adsbygoogle.js"]'));

    const buttonTexts = Array.from(document.querySelectorAll('button')).map((button) => (button.textContent || '').trim());

    const bodyText = (document.body?.innerText || '').slice(0, 400);

    return {
      scenario: scenarioLabel,
      url: location.href,
      title: document.title,
      consentRaw: raw,
      consentParsed: parsed,
      adElementCount: adElements.length,
      adStatuses: adElements.map((el) => el.getAttribute('data-adsbygoogle-status') || 'none'),
      adScriptCount: adScripts.length,
      bannerVisible: Boolean(Array.from(document.querySelectorAll('button')).find((b) => b.textContent && b.textContent.includes('Tümünü Kabul Et'))),
      buttonTexts,
      bodyText,
    };
  }, label);
}

async function resetStorage(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.removeItem('cookie-consent');
    sessionStorage.clear();
  });
  const cookies = await page.cookies();
  if (cookies.length > 0) {
    await page.deleteCookie(...cookies);
  }
  await page.reload({ waitUntil: 'networkidle2' });
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, defaultViewport: { width: 1366, height: 900 } });
  const page = await browser.newPage();

  try {
    await resetStorage(page);
    const rejectBannerVisible = await waitForConsentBanner(page);

    const foundReject = await clickButtonByText(page, 'Sadece Zorunlu');
    await delay(1500);
    const rejectState = await collectState(page, 'reject');
    rejectState.buttonFound = foundReject;
    rejectState.bannerDetectedBeforeClick = rejectBannerVisible;

    await resetStorage(page);
    const acceptBannerVisible = await waitForConsentBanner(page);

    const foundAccept = await clickButtonByText(page, 'Tümünü Kabul Et');
    await delay(2500);
    const acceptState = await collectState(page, 'accept');
    acceptState.buttonFound = foundAccept;
    acceptState.bannerDetectedBeforeClick = acceptBannerVisible;

    console.log(JSON.stringify({ rejectState, acceptState }, null, 2));
  } catch (error) {
    console.error('TEST_ERROR', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
