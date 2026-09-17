const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.URI;

if (!uri) {
  console.error("CRITICAL: URI environment variable missing!");
}

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(uri || "", {
      serverSelectionTimeoutMS: 5000,
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
  }

  await cachedClient.connect();
  cachedDb = cachedClient.db("portfolioDB");
  return cachedDb;
}

// Middleware to inject DB collections into requests dynamically
const checkDB = async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    req.db = db;
    req.projectsCollection = db.collection("projects");
    req.timelineCollection = db.collection("timeline");
    req.resumeCollection = db.collection("resume");
    next();
  } catch (err) {
    console.error("MongoDB Connection Failed:", err.message);
    return res.status(503).json({
      error: "Database connection failure.",
      details: err.message,
    });
  }
};

app.get("/", (req, res) => {
  res.send("Portfolio Server Running...");
});

// --- RESUME ROUTES ---
app.get("/api/resume", checkDB, async (req, res) => {
  try {
    const result = await req.resumeCollection.findOne(
      {},
      { sort: { _id: -1 } },
    );
    res.status(200).json(result || { resumeUrl: "" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error fetching resume", details: err.message });
  }
});

app.post("/api/resume", checkDB, async (req, res) => {
  try {
    const { resumeUrl } = req.body;
    if (!resumeUrl) {
      return res.status(400).json({ error: "Resume URL is required" });
    }

    const result = await req.resumeCollection.updateOne(
      {},
      { $set: { resumeUrl, updatedAt: new Date() } },
      { upsert: true },
    );
    res.status(200).json({ message: "Resume saved to MongoDB", result });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error updating resume", details: err.message });
  }
});

// --- PROJECTS ROUTES ---
app.get("/api/projects", checkDB, async (req, res) => {
  try {
    const result = await req.projectsCollection
      .find()
      .sort({ _id: -1 })
      .toArray();
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error fetching projects", details: err.message });
  }
});

app.post("/api/projects", checkDB, async (req, res) => {
  try {
    const result = await req.projectsCollection.insertOne(req.body);
    res.status(201).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error adding project", details: err.message });
  }
});

app.put("/api/projects/:id", checkDB, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid ID" });
    const { _id, ...updatedData } = req.body;
    const result = await req.projectsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData },
    );
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error updating project", details: err.message });
  }
});

app.delete("/api/projects/:id", checkDB, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid ID" });
    const result = await req.projectsCollection.deleteOne({
      _id: new ObjectId(id),
    });
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error deleting project", details: err.message });
  }
});

// --- TIMELINE ROUTES ---
app.get("/api/timeline", checkDB, async (req, res) => {
  try {
    const result = await req.timelineCollection
      .find()
      .sort({ _id: -1 })
      .toArray();
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error fetching timeline", details: err.message });
  }
});

app.post("/api/timeline", checkDB, async (req, res) => {
  try {
    const result = await req.timelineCollection.insertOne(req.body);
    res.status(201).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error adding timeline item", details: err.message });
  }
});

app.put("/api/timeline/:id", checkDB, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid ID" });
    const { _id, ...updatedData } = req.body;
    const result = await req.timelineCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData },
    );
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error updating timeline item", details: err.message });
  }
});

app.delete("/api/timeline/:id", checkDB, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid ID" });
    const result = await req.timelineCollection.deleteOne({
      _id: new ObjectId(id),
    });
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error deleting timeline item", details: err.message });
  }
});

// Export app for serverless execution
module.exports = app;

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
