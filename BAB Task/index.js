import puppeteer from "puppeteer";
import { pipeline } from "@xenova/transformers";
import { QdrantClient } from "@qdrant/js-client-rest";
import XLSX from "xlsx";
export async function getEmmbeddings(text) {
  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  const embeddings = await extractor(text, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(embeddings.data);
}

async function addData(qdrantClient, data) {
  const activities = [];
  for (let i = 0; i < data.length; i++) {
    const vector = await getEmmbeddings(data[i]);
    activities.push({
      id: i + 1,
      vector,
      payload: {
        activity: data[i],
      },
    });
  }

  await qdrantClient.upsert("contractors", {
    wait: true,
    points: activities,
  });
}

export async function initQdrant() {
  const client = new QdrantClient({
    url: "https://f34c7e73-3a6d-4439-917c-986822f3847e.europe-west3-0.gcp.cloud.qdrant.io:6333",
    apiKey: "cC0awqexnEHOH7t0wbfzoD37NfEidSuE5lPDCPirEePKEi3acEwmqg",
  });

  const collectionName = "contractors";

  const response = await client.getCollections();

  const collectionNames = response.collections.map(
    (collection) => collection.name
  );

  if (collectionNames.includes(collectionName)) {
    await client.deleteCollection(collectionName);
  }

  await client.createCollection(collectionName, {
    vectors: {
      size: 384,
      distance: "Cosine",
    },
    optimizers_config: {
      default_segment_number: 2,
    },
    replication_factor: 2,
  });

  await client.createPayloadIndex(collectionName, {
    field_name: "activity",
    field_schema: "keyword",
    wait: true,
  });

  return client;
}

export async function scrabber() {
  console.log("scraping started");
  const qdrantClient = await initQdrant();
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const data = [];
  const DataForEx = [];
  for (let i = 1; i <= 10; i++) {
    const url = `https://muqawil.org/en/contractors?page=${i}`;
    await page.goto(url, { waitUntil: "networkidle2" });
    const allContractors = await page.evaluate((i) => {
      const cardElement = document.querySelectorAll(".section-card");
      const contractors = Array.from(cardElement)
        .map((elem) => {
          const contractorDetails = {};
          const detailsPage = elem.querySelector(".card-title a");
          if (detailsPage) {
            contractorDetails["page"] = i;
            contractorDetails["link"] = detailsPage.getAttribute("href");
            contractorDetails["Company Name"] = detailsPage.textContent.trim();
          }
          return contractorDetails;
        })
        .filter((contractor) => Object.keys(contractor).length);

      return contractors;
    }, i);

    for (let j = 0; j < allContractors.length; j++) {
      await page.goto(allContractors[j].link, { waitUntil: "networkidle2" });
      const Contractor = await page.evaluate(() => {
        const requestedSelectors = {
          "Membership Number": "Membership Number",
          City: "City",
          "Email ": "Email",
          "Phone Number": "Phone Number",
        };
        const contractorDetails = {};
        const detailsPage = document.querySelector(".card-title");
        contractorDetails["Company Name"] = detailsPage.textContent.trim();
        const infoBoxElements = document.querySelectorAll(
          ".info-box .info-details"
        );

        Array.from(infoBoxElements).map((infoBox) => {
          const name = infoBox.querySelector(".info-name").textContent;
          if (requestedSelectors[name]) {
            contractorDetails[requestedSelectors[name]] = infoBox
              .querySelector(".info-value")
              .textContent.trim();
          }
        });

        const activitiesElements = document.querySelectorAll(".list-item");
        const activities = Array.from(activitiesElements).map((activity) =>
          activity.textContent.replace("\n", "")
        );
        contractorDetails["Activities"] = activities;
        return contractorDetails;
      });
      data.push(Contractor);
    }

    const res = allContractors.map((c) => {
      const contractor = data.find(
        (cont) => cont["Company Name"] === c["Company Name"]
      );
      return { ...c, ...contractor };
    });
    const finalData = res.map(({ link, ...rest }) => {
      rest.Activities = rest.Activities.join(",");
      DataForEx.push(rest);
      return rest;
    });
   
  }
  console.log("scraping finished");

  //  Excel => =>
  const ws = XLSX.utils.json_to_sheet(DataForEx);
  ws["!cols"] = [
    { wch: 10 },
    { wch: 70 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 70 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contractors Data");

  const filePath = "contractors_data.xlsx";
  XLSX.writeFile(wb, filePath);

  console.log(`Excel saved ${filePath}`);

   // add data => => qdrant
   const promises = [];
   for (let i = 0; i < 5; i++) {
     promises.push(addData(qdrantClient, DataForEx[i].Activities));
   }

   await Promise.all(promises);
   console.log("add data qdrant success");
}
