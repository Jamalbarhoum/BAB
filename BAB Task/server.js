import express from "express";
import path from "path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import { scrabber, initQdrant, getEmmbeddings } from "./index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());

scrabber();
app.get("/search", search);
app.use("/", express.static(path.join(__dirname, "assets")));

app.get("/", serveFrontend);

function serveFrontend(request, response) {
  response.sendFile(path.join(__dirname, "assets", "index.html"));
}

async function search(req, res) {

  try {
    const { term } = req.query;
    console.log(term);
    
    const qdrantClient = await initQdrant();
    const vectors = await getEmmbeddings(term);
    console.log(vectors);
    
    const res1 = await qdrantClient.search("contractors", {
      vector: vectors,
      score_threshold: 0.75,
    });
    console.log(res1);

    return res.status(200).json(res1);
  } catch (error) {
    console.log(error);
    
    return res.status(404).json({
      error:error.message
    });
    
  }
}

app.listen("3000", () => {
  console.log("http://localhost:3000/ => => => started");
});
