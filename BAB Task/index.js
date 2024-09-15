const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

const XLSX = require("xlsx");

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://muqawil.org/en/contractors", {
    waitUntil: "networkidle2",
  });

  const content = await page.content();
  const $ = cheerio.load(content);

  const data = [];
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
    

    const city = values["City"] || "";

    const email = $(element).find(".info-box-wrapper .row");

    const rows = $(element).find(".info-box-wrapper .row");

    rows.each((index, row) => {
      const anchor = $(row).find(
        ".info-box.has-action .info-details .info-value a"
      );

      if (anchor.length) {
        const href = anchor.attr("href");
        if (href) {
          const email = href.replace("mailto:", "").trim();
          console.log(email);
        } else {
          console.log("No href attribute found.");
        }
      } else {
        console.log("No anchor tag found.");
      }
    });

    data.push({
      companyName,
      number,
      city,
      email: email,
    });
  });

  // Excel
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contractors Data");
  const excelFilePath = "data.xlsx";
  // XLSX.writeFile(wb, excelFilePath);
  console.log(`Excel file generated at ${excelFilePath}`);



  await browser.close();
})();
