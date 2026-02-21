const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  page.on('pageerror', (err) => {
    console.log('[PAGEERROR]', err?.message || err);
  });

  page.on('console', (msg) => {
    console.log('[CONSOLE]', msg.type(), msg.text());
  });

  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/en') || url.includes('/api/')) {
      console.log('[RESPONSE]', res.status(), url);
    }
  });

  try {
    await page.goto('http://localhost:3100/en', { waitUntil: 'networkidle2', timeout: 60000 });
    const title = await page.title();
    const bodyText = await page.evaluate(() => (document.body?.innerText || '').slice(0, 500));
    console.log('[TITLE]', title);
    console.log('[BODY]', bodyText);
  } catch (error) {
    console.log('[SCRIPT_ERROR]', error?.message || error);
  } finally {
    await browser.close();
  }
})();
