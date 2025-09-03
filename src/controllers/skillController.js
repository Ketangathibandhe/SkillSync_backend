const User = require("../models/user");
const Roadmap = require("../models/roadmap");

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// Helper: Skill Gap Analysis
const getSkillGapFromModel = async (targetRole, currentSkills) => {
  const prompt = `
You're an expert career mentor helping someone become a ${targetRole}.
Current skills: ${currentSkills.join(", ")}.

Please return the response in clean Markdown format with clear structure:
- Use plain text headings like:  Missing Skills and  Learning Priorities
- Make each heading visually distinct 
- Use simple numbered list (1., 2., etc.) for bullet points, no asterisks (*)
- Use numbered list (1., 2., etc.) for priorities
- Do NOT use markdown symbols like # or *
- Do NOT include any intro or closing statements

Respond only with Markdown. Keep it visually clean, readable, and scannable.
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
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
};

// Helper: Roadmap Generation (with bulletproof parsing)
const getRoadmapFromModel = async (targetRole, skillGap) => {
  const prompt = `
Create a **comprehensive and detailed learning roadmap** for becoming a ${targetRole}.
Base it on the following skill gap:
${skillGap}

 Important instructions:
- Respond ONLY with valid JSON (no backticks, no markdown, no explanation).
- Include at least 6-8 steps (phases).
- Each step should have:
  - "title": short clear name
  - "duration": realistic time estimate (e.g. "2-4 weeks")
  - "topics": a detailed list of subtopics (minimum 4–6 items)
  - "resources": at least 3 high-quality resources (courses, books, articles, videos)
  - "projects": at least 1–2 practical projects per step
  - "status": default as "pending"

Format strictly like this:

{
  "steps": [
    {
      "title": "Step Title",
      "duration": "2-3 weeks",
      "topics": ["Topic 1", "Topic 2", "Topic 3"],
      "resources": ["Resource 1", "Resource 2", "Resource 3"],
      "projects": ["Project 1"],
      "status": "pending"
    }
  ]
}
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

  // Clean rawText before parsing
  rawText = rawText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    console.error("Roadmap JSON parse failed:", err);

    // Fallback: extract first valid JSON block using regex and sanitize
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

  return { steps: parsed.steps || [], rawText };
};

// API 1: Skill Gap Analysis
const analyzeSkillGap = async (req, res) => {
  try {
    const { targetRole, currentSkills } = req.body;

    if (!targetRole || !Array.isArray(currentSkills)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const gap = await getSkillGapFromModel(targetRole, currentSkills);

    res.json({
      gapAnalysis: gap || "No response from model",
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

    // Step 1: Get skill gap
    const skillGap = await getSkillGapFromModel(targetRole, currentSkills);

    // Step 2: Get roadmap steps
    const { steps, rawText } = await getRoadmapFromModel(targetRole, skillGap);

    // Step 3: Save roadmap
    const roadmap = new Roadmap({
      userId,
      targetRole,
      currentSkills,
      skillGap,
      steps,
      rawText,
      progress: 0, //  initial progress
    });

    await roadmap.save();

    // Step 4: Link roadmap to user
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

    res.status(200).json({ success: true, message: "Roadmap deleted successfully" });
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
    const completedSteps = roadmap.steps.filter(s => s.status === "completed").length;
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
  updateStepStatus
};