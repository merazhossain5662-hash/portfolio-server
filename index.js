const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Portfolio Server Running...");
});

const uri = process.env.URI;
let db, projectsCollection, timelineCollection, resumeCollection;

const client = new MongoClient(uri || "", {
  serverSelectionTimeoutMS: 5000,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

client
  .connect()
  .then(() => {
    db = client.db("portfolioDB");
    projectsCollection = db.collection("projects");
    timelineCollection = db.collection("timeline");
    resumeCollection = db.collection("resume");
    console.log("Connected to MongoDB successfully!");
  })
  .catch((err) => {
    console.error("MongoDB Connection Error:", err.message);
  });

const checkDB = (req, res, next) => {
  if (!projectsCollection || !timelineCollection || !resumeCollection) {
    return res.status(503).json({
      error:
        "Database not connected yet or URI is invalid. Check terminal logs.",
    });
  }
  next();
};

// --- RESUME ROUTES ---
app.get("/api/resume", checkDB, async (req, res) => {
  try {
    const result = await resumeCollection.findOne({}, { sort: { _id: -1 } });
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

    // Upsert the latest resume document
    const result = await resumeCollection.updateOne(
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
    const result = await projectsCollection.find().sort({ _id: -1 }).toArray();
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error fetching projects", details: err.message });
  }
});

app.post("/api/projects", checkDB, async (req, res) => {
  try {
    const result = await projectsCollection.insertOne(req.body);
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
    const result = await projectsCollection.updateOne(
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
    const result = await projectsCollection.deleteOne({
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
    const result = await timelineCollection.find().sort({ _id: -1 }).toArray();
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error fetching timeline", details: err.message });
  }
});

app.post("/api/timeline", checkDB, async (req, res) => {
  try {
    const result = await timelineCollection.insertOne(req.body);
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
    const result = await timelineCollection.updateOne(
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
    const result = await timelineCollection.deleteOne({
      _id: new ObjectId(id),
    });
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error deleting timeline item", details: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
