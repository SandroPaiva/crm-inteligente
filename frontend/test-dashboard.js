import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER EXCEPTION:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle2' }).catch(e=>console.log("Nav error", e));
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
