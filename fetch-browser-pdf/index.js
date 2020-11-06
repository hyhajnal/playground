const puppeteer = require('puppeteer');

const COOKIES = [
    {
        "domain": ".geekbang.org",
        "expirationDate": 1667101422,
        "hostOnly": false,
        "httpOnly": false,
        "name": "_ga",
        "path": "/",
        "sameSite": "unspecified",
        "secure": false,
        "session": false,
        "storeId": "0",
        "value": "GA1.2.216835632.1588496052",
        "id": 1
    },
];

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        await page.goto('https://time.geekbang.org/column/article/79433', { waitUntil: 'networkidle2' });
        

        await page.setCookie(...COOKIES);
        await page.setViewport({ width: 1200, height: 800 });

        await autoScroll(page);

        let title = await page.title();
        // await page.pdf({ path: title + '.pdf', format: 'A4' });
        await page.screenshot({ path: '1.png', fullPage: true });

        await browser.close();
    } catch (e) {
        console.log(e);
    }
})();


function autoScroll(page) {
    return page.evaluate(() => {
        return new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        })
    });
}


