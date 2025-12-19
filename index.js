import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = "apify/instagram-comments-scraper";

// ===============================
// CURATED FITNESS PROFILES (MVP)
// ===============================
const CURATED_PROFILES = [
  "niteshsoniy",
  "saketgokhale",
  "fitgirl_08",
  "unfitofit_official_",
  "fitnesswithabc",
  "homeworkoutindia",
  "indianweightlosscoach",
  "fitlife_hindi",
  "healthynation_india",
  "gymmotivation_india",
  "yoga_with_india",
  "dietcoach_india",
  "weightlossjourney_india",
  "musclebuild_india",
  "fatlosscoach_india",
  "fitness_transform_india",
  "homefitness_india",
  "nutritioncoach_india",
  "workoutathome_india",
  "healthyhabits_india"
];

// ===============================
// HELPER: Get curated profiles
// ===============================
function getCuratedProfiles() {
  return CURATED_PROFILES;
}

// ===============================
// INTENT KEYWORDS
// ===============================
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
  "muscle"
];

// ===============================
// INDIA SIGNAL WORDS
// ===============================
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

// ===============================
// HEALTH CHECK
// ===============================
app.get("/", (req, res) => {
  res.send("Backend is running 👍");
});

// ===============================
// GENERATE LEADS (NO INPUT)
// ===============================
app.post("/generate-leads", async (req, res) => {
  try {
    let allComments = [];

    // Use only first 4 hashtags (demo-safe)
    const tagsToUse = HASHTAGS.slice(0, 4);

    for (const tag of tagsToUse) {
      const runResponse = await axios.post(
        `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
        {
          hashtags: [tag],
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

    // ===============================
    // FILTER LEADS (INTENT + INDIA)
    // ===============================
    const leads = allComments.filter(item => {
      const text = item.text?.toLowerCase() || "";

      const intentMatch = INTENT_KEYWORDS.some(k => text.includes(k));
      const indiaMatch = INDIA_SIGNALS.some(i => text.includes(i));

      return intentMatch && indiaMatch;
    });

    // ===============================
    // FORMAT OUTPUT
    // ===============================
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

// ===============================
// START SERVER
// ===============================
app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});
