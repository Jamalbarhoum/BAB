const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const XLSX = require("xlsx");

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const data = [];

    for (let i = 1; i <= 10; i++) {
      const url = `https://muqawil.org/en/contractors?page=${i}`;
      await page.goto(url, { waitUntil: "networkidle2" });
      const content = await page.content();
      const $ = cheerio.load(content);

      $(".section-card").each((index, element) => {
        const companyName = $(element).find(".card-title").text().trim();
        const infoBoxes = $(element).find(".info-box");
        const values = {};
        infoBoxes.each((i, box) => {
          const name = $(box).find(".info-name").text().trim();
          const value = $(box).find(".info-value").text().trim();
          values[name] = value;
        });

        const number = values["Membership Number"] || "";

        let city = "Not Available";
        let region = "Not Available";
        const cityRegionValue = values["City - Region"] || "";
        if (cityRegionValue) {
          const [cityValue, regionValue] = cityRegionValue.split('-').map(part => part.trim());
          city = cityValue || "Not Available";
          region = regionValue || "Not Available";
        }

        const emailElement = $(element).find(".info-box.has-action .info-details .info-value a");
        const email = emailElement.length ? emailElement.attr("href").replace("mailto:", "").trim() : "Not Available";

        data.push({
          page:i,
          companyName,
          number,
          city,
          region,
          email,
        });
      });
    }

    console.log(data);
    
    // Excel
    const ws = XLSX.utils.json_to_sheet(data);

    // Adding styles (basic example)
    ws['!cols'] = [{ wpx: 200 }, { wpx: 200 }, { wpx: 150 }, { wpx: 150 }, { wpx: 150 }, { wpx: 200 }]; // column width

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contractors Data");

    const excelFilePath = "data.xlsx";
    XLSX.writeFile(wb, excelFilePath);
    console.log(`Excel file generated at ${excelFilePath}`);

    await browser.close();
  } catch (err) {
    console.error('Error:', err.stack);
  }
})();
