import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = process.env.APIFY_ACTOR_ID;

// ================================
// PRESET GLOBAL HASHTAGS
// ================================
const PRESET_HASHTAGS = [
  "weightloss",
  "fatloss",
  "bellyfat",
  "loseweight",
  "weightlossjourney",
  "diet",
  "fitness",
  "healthylifestyle",
  "transformation",
  "weightgain",
  "gainweight",
  "skinny",
  "skinnyfat",
  "bulking",
  "musclebuilding",
  "fitnessjourney"
];

// ================================
// FILTER KEYWORDS (INTENT)
// ================================
const INTENT_KEYWORDS = [
  "weight loss",
  "lose weight",
  "fat loss",
  "belly fat",
  "diet",
  "help",
  "how",
  "weight gain",
  "skinny",
  "muscle",
  "fitness"
];

// ================================
// INDIA SIGNAL WORDS
// ================================
const INDIA_SIGNALS = [
  "mujhe",
  "kaise",
  "bhai",
  "sir",
  "pls",
  "please",
  "help",
  "kya",
  "hai",
  "karna",
  "india",
  "desi"
];

// ================================
// HEALTH CHECK
// ================================
app.get("/", (req, res) => {
  res.send("Backend is running 👍");
});

// ================================
// GENERATE LEADS (NO INPUT)
// ================================
app.post("/generate-leads", async (req, res) => {
  try {
    let allComments = [];

    // Use only first 6 hashtags (safe demo)
    const tagsToUse = PRESET_HASHTAGS.slice(0, 6);

    for (const tag of tagsToUse) {
      const runResponse = await axios.post(
        `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
        {
          search: `#${tag}`,
          resultsType: "comments",
          resultsLimit: 50
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

      if (status === "SUCCEEDED") {
        const dataRes = await axios.get(
          `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
        );

        allComments = allComments.concat(dataRes.data);
      }
    }

    // ================================
    // FILTER INDIAN FITNESS LEADS
    // ================================
    const leads = allComments.filter(item => {
      const text = item.text?.toLowerCase() || "";

      const intentMatch = INTENT_KEYWORDS.some(k => text.includes(k));
      const indiaMatch = INDIA_SIGNALS.some(i => text.includes(i));

      return intentMatch && indiaMatch;
    });

    // ================================
    // FORMAT RESPONSE
    // ================================
    const formattedLeads = leads.map(item => ({
      username: item.ownerUsername,
      comment: item.text,
      profile: `https://instagram.com/${item.ownerUsername}`
    }));

    res.json({
      success: true,
      totalLeads: formattedLeads.length,
      leads: formattedLeads
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      error: "Failed to generate leads"
    });
  }
});

// ================================
// START SERVER
// ================================
app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});
