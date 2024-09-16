const puppeteer = require("puppeteer");
const XLSX = require("xlsx");

async function scrabber() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const data = [];
  const DataForEx = [];
  for (let i = 1; i <= 10; i++) {
    const url = `https://muqawil.org/en/contractors?page=${i}`;
    await page.goto(url, { waitUntil: "networkidle2" });
    const allContractors = await page.evaluate((i) => {
      const cardElement = document.querySelectorAll(".section-card");

      const contractors = Array.from(cardElement).map((elem) => {
        const contractorDetails = {};
        const detailsPage = elem.querySelector(".card-title a");

        if (detailsPage) {
          contractorDetails["page"] = i;
          contractorDetails["link"] = detailsPage.getAttribute("href");
          contractorDetails["companyName"] = detailsPage.textContent.trim();
          console.log(detailsPage);
        }
        console.log(contractorDetails);

        return contractorDetails;
      });

      const filteredContractors = contractors.filter((elm) => {
        return elm.link && elm.companyName;
      });
      return filteredContractors;
    }, i);

    for (let j = 0; j < allContractors.length; j++) {
      await page.goto(allContractors[j].link, { waitUntil: "networkidle2" });

      const Contractor = await page.evaluate(() => {
        const requestedSelectors = {
          "Membership Number": true,
          City: true,
          "Email ": true,
          phone: true,
        };
        const contractorDetails = {};

        const detailsPage = document.querySelector(".card-title");
        contractorDetails["companyName"] = detailsPage.textContent.trim();

        const infoBoxElements = document.querySelectorAll(
          ".info-box .info-details"
        );
        console.log("infoBoxElements: ", infoBoxElements);
        Array.from(infoBoxElements).map((infoBox) => {
          const name = infoBox.querySelector(".info-name").textContent;
          if (requestedSelectors[name]) {
            contractorDetails[name] = infoBox
              .querySelector(".info-value")
              .textContent.trim();
          }
        });

        return contractorDetails;
      });
      data.push(Contractor);
    }

    const res = allContractors.map((c) => {
      const contractor = data.find(
        (cont) => cont.companyName === c.companyName
      );
      return { ...c, ...contractor };
    });

    const finalData = res.map(({ link, ...rest }) => {
      DataForEx.push(rest);
      return rest;
    });
  }

  // => => => Excel
  const ws = XLSX.utils.json_to_sheet(DataForEx);
  ws["!cols"] = [
    { wch: 10 },
    { wch: 70 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contractors Data");

  const filePath = "contractors_data.xlsx";
  //  XLSX.writeFile(wb, filePath);

  console.log(`Excel saved ${filePath}`);
}

scrabber();
