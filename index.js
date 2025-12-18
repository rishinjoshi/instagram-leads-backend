import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = process.env.APIFY_ACTOR_ID;

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running 👍");
});

app.post("/generate-leads", async (req, res) => {
  try {
    const { postUrl, plan } = req.body;

    if (!postUrl) {
      return res.status(400).json({ error: "postUrl required" });
    }

    const runResponse = await axios.post(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
      {
        directUrls: [postUrl],
        resultsType: "comments",
        resultsLimit: 100
      }
    );

    const runId = runResponse.data.data.id;

    let status = "RUNNING";
    let datasetId = null;

    while (status === "RUNNING" || status === "READY") {
      await new Promise(r => setTimeout(r, 5000));

      const statusRes = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
      );

      status = statusRes.data.data.status;
      datasetId = statusRes.data.data.defaultDatasetId;
    }

    const dataRes = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
    );

    const keywords = [
      "weight loss",
      "lose weight",
      "fat loss",
      "belly fat",
      "weight gain",
      "diet",
      "gym",
      "fitness"
    ];

    let leads = dataRes.data.filter(item =>
      keywords.some(k => item.text?.toLowerCase().includes(k))
    );

    if (plan === "basic") leads = leads.slice(0, 20);
    if (plan === "pro") leads = leads.slice(0, 100);

    const finalLeads = leads.map(item => ({
      username: item.ownerUsername,
      comment: item.text,
      profile: `https://instagram.com/${item.ownerUsername}`
    }));

    res.json({
      success: true,
      total: finalLeads.length,
      leads: finalLeads
    });

  } catch (err) {
    res.status(500).json({ success: false, error: "Something went wrong" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});
