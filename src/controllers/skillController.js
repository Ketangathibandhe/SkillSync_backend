const User = require("../models/user");
const Roadmap = require("../models/roadmap");

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Helper: Gemini Call (Skill Gap)
const getSkillGapFromModel = async (targetRole, currentSkills) => {
  const prompt = `
You're a senior career mentor helping someone become a ${targetRole}.
Current skills: ${currentSkills.join(", ")}.

Please return the response in clean Markdown format with this exact structure:

Missing Skills  
1. Skill A  
2. Skill B  
... (at least 8–10 items)

Learning Priorities  
1. Priority A  
2. Priority B  
... (at least 8–10 items)

Instructions:
- Use plain text headings: Missing Skills and Learning Priorities
- Use numbered lists (1., 2., etc.)
- No intro, no closing, no markdown symbols
- Respond only with the above format
`;

  const response = await fetch(
    `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

  console.log("Gemini raw skill gap:", rawText);

  if (!rawText || rawText.length < 10) {
    return `
Missing Skills  
1. System Design  
2. API Security  
3. CI/CD Pipelines  
4. Caching Strategies  
5. Database Indexing  
6. OAuth & JWT  
7. Docker & Containers  
8. Microservices  
9. Monitoring & Logging  
10. Testing Strategies  

Learning Priorities  
1. Master scalable architecture  
2. Learn Redis and Memcached  
3. Implement CI/CD with GitHub Actions  
4. Explore Docker and Kubernetes  
5. Study SQL optimization techniques  
6. Practice integration testing  
7. Build microservices with Node.js  
8. Secure APIs with OAuth2  
9. Monitor apps with Prometheus  
10. Write unit and E2E tests  
`;
  }

  return rawText;
};

// Helper: Roadmap Generation
const getRoadmapFromModel = async (targetRole, skillGap) => {
  const prompt = `
You're a senior technical mentor. Create a comprehensive learning roadmap for becoming a ${targetRole}.

Base it on the following skill gap:
${skillGap}

Instructions:
- Respond ONLY with valid JSON (no markdown, no explanation)
- Include 9–10 steps
- Each step must have:
  - "title"
  - "duration"
  - "topics" (min 5)
  - "resources" (min 3)
  - "projects" (min 2)
  - "status": "pending"
`;

  const response = await fetch(
    `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await response.json();
  let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

  console.log("Gemini raw roadmap:", rawText);

  rawText = rawText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    console.error("Roadmap JSON parse failed:", err);
    const match = rawText.match(/\{[\s\S]*\}/);
    try {
      const cleaned = match?.[0]
        ?.replace(/'/g, '"')
        ?.replace(/,\s*}/g, "}")
        ?.replace(/,\s*]/g, "]");
      parsed = cleaned ? JSON.parse(cleaned) : { steps: [] };
    } catch (fallbackErr) {
      console.error("Fallback parse also failed:", fallbackErr);
      parsed = { steps: [] };
    }
  }

  // Fallback if Gemini fails
  if (!parsed.steps || parsed.steps.length < 9) {
    parsed.steps = Array.from({ length: 10 }, (_, i) => ({
      title: `Phase ${i + 1}: Core Backend Concept ${i + 1}`,
      duration: "2-3 weeks",
      topics: [
        "Topic A",
        "Topic B",
        "Topic C",
        "Topic D",
        "Topic E"
      ],
      resources: [
        "Resource 1",
        "Resource 2",
        "Resource 3"
      ],
      projects: [
        "Project 1",
        "Project 2"
      ],
      status: "pending"
    }));
    rawText = JSON.stringify({ steps: parsed.steps }, null, 2);
  }

  return { steps: parsed.steps || [], rawText };
};

// Helper: Parse Skill Gap Markdown to JSON
const parseSkillGapMarkdown = (markdown) => {
  const lines = markdown.split("\n").map((l) => l.trim());
  let missingSkills = [];
  let learningPriorities = [];
  let section = null;

  for (const line of lines) {
    if (/Missing\s+Skills|Skills\s+You\s+Need/i.test(line)) {
      section = "missing";
      continue;
    }
    if (/Learning\s+Priorities|Top\s+Priorities/i.test(line)) {
      section = "priorities";
      continue;
    }
    if (/^\d+\./.test(line)) {
      const clean = line.replace(/^\d+\.\s*/, "").trim();
      if (section === "missing") missingSkills.push(clean);
      if (section === "priorities") learningPriorities.push(clean);
    }
  }

  return { missingSkills, learningPriorities };
};

// API 1: Skill Gap Analysis
const analyzeSkillGap = async (req, res) => {
  try {
    const { targetRole, currentSkills } = req.body;

    if (!targetRole || !Array.isArray(currentSkills)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const gapString = await getSkillGapFromModel(targetRole, currentSkills);
    const parsedGap = parseSkillGapMarkdown(gapString);

    res.json({
      gapAnalysis: parsedGap,
      rawGap: gapString,
    });
  } catch (err) {
    console.error("Skill gap error:", err);
    res.status(500).json({ error: "Failed to analyze skill gap" });
  }
};

// API 2: Roadmap Creation
const generateRoadmap = async (req, res) => {
  try {
    const { targetRole, currentSkills } = req.body;
    const userId = req.user?._id;

    if (!userId || !targetRole || !Array.isArray(currentSkills)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const skillGap = await getSkillGapFromModel(targetRole, currentSkills);
    const { steps, rawText } = await getRoadmapFromModel(targetRole, skillGap);

    const roadmap = new Roadmap({
      userId,
      targetRole,
      currentSkills,
      skillGap,
      steps,
      rawText,
      progress: 0,
    });

    await roadmap.save();

    await User.findByIdAndUpdate(userId, {
      $push: { roadmaps: roadmap._id },
    });

    res.status(201).json({ success: true, roadmap });
  } catch (err) {
    console.error("Roadmap creation error:", err);
    res.status(500).json({ error: "Failed to generate roadmap" });
  }
};


// API 3: Roadmap Fetch by ID
const getRoadmapById = async (req, res) => {
  try {
    const userId = req.user?._id;
    const roadmapId = req.params.id;

    if (!userId || !roadmapId) {
      return res.status(400).json({ error: "Missing userId or roadmapId" });
    }

    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId });

    if (!roadmap) {
      return res.status(404).json({ error: "Roadmap not found" });
    }

    res.status(200).json({ roadmap });
  } catch (err) {
    console.error("Roadmap fetch by ID error:", err);
    res.status(500).json({ error: "Failed to fetch roadmap" });
  }
};

// API 4: All roadmaps for logged-in user (sidebar)
const getUserRoadmaps = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const roadmaps = await Roadmap.find({ userId })
      .select("_id targetRole progress createdAt updatedAt")
      .sort({ createdAt: -1 });

    res.status(200).json({ roadmaps });
  } catch (err) {
    console.error("User roadmaps list error:", err);
    res.status(500).json({ error: "Failed to fetch user roadmaps" });
  }
};

// API 5: Latest roadmap for logged-in user (default load)
const getLatestRoadmap = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const roadmap = await Roadmap.findOne({ userId }).sort({ createdAt: -1 });
    if (!roadmap) return res.status(404).json({ error: "No roadmaps found" });

    res.status(200).json({ roadmap });
  } catch (err) {
    console.error("Latest roadmap fetch error:", err);
    res.status(500).json({ error: "Failed to fetch latest roadmap" });
  }
};

// API 6: Delete roadmap by ID
const deleteRoadmapById = async (req, res) => {
  try {
    const userId = req.user?._id;
    const roadmapId = req.params.id;

    if (!userId || !roadmapId) {
      return res.status(400).json({ error: "Missing userId or roadmapId" });
    }

    // Find and delete roadmap owned by this user
    const roadmap = await Roadmap.findOneAndDelete({ _id: roadmapId, userId });

    if (!roadmap) {
      return res.status(404).json({ error: "Roadmap not found" });
    }

    // Remove roadmap reference from User document
    await User.findByIdAndUpdate(userId, {
      $pull: { roadmaps: roadmapId },
    });

    res
      .status(200)
      .json({ success: true, message: "Roadmap deleted successfully" });
  } catch (err) {
    console.error("Roadmap delete error:", err);
    res.status(500).json({ error: "Failed to delete roadmap" });
  }
};

// API 7: Update step status & recalc progress
const updateStepStatus = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { roadmapId, stepIndex, status } = req.body;

    if (!userId || roadmapId == null || stepIndex == null || !status) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId });
    if (!roadmap) {
      return res.status(404).json({ error: "Roadmap not found" });
    }

    // Update step status
    if (!roadmap.steps[stepIndex]) {
      return res.status(400).json({ error: "Invalid step index" });
    }
    roadmap.steps[stepIndex].status = status;

    // Recalculate progress
    const totalSteps = roadmap.steps.length;
    const completedSteps = roadmap.steps.filter(
      (s) => s.status === "completed"
    ).length;
    roadmap.progress = Math.round((completedSteps / totalSteps) * 100);

    await roadmap.save();

    res.status(200).json({ success: true, roadmap });
  } catch (err) {
    console.error("Update step status error:", err);
    res.status(500).json({ error: "Failed to update step status" });
  }
};

module.exports = {
  analyzeSkillGap,
  generateRoadmap,
  getRoadmapById,
  getUserRoadmaps,
  getLatestRoadmap,
  deleteRoadmapById,
  updateStepStatus,
};



