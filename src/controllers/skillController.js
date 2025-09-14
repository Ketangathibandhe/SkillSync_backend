// const User = require("../models/user");
// const Roadmap = require("../models/roadmap");

// const GEMINI_API_URL =
//   "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// // Helper: Skill Gap Analysis
// const getSkillGapFromModel = async (targetRole, currentSkills) => {
//   const prompt = `
// You're an expert career mentor helping someone become a ${targetRole}.
// Current skills: ${currentSkills.join(", ")}.

// Please return the response in clean Markdown format with clear structure:
// - Use plain text headings like:  Missing Skills and  Learning Priorities
// - Make each heading visually distinct 
// - Use simple numbered list (1., 2., etc.) for bullet points, no asterisks (*)
// - Use numbered list (1., 2., etc.) for priorities
// - Do NOT use markdown symbols like # or *
// - Do NOT include any intro or closing statements

// Respond only with Markdown. Keep it visually clean, readable, and scannable.
// `;

//   const response = await fetch(
//     `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
//     {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         contents: [{ parts: [{ text: prompt }] }],
//       }),
//     }
//   );

//   const data = await response.json();
//   return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
// };

// // Helper: Roadmap Generation (with bulletproof parsing)
// const getRoadmapFromModel = async (targetRole, skillGap) => {
//   const prompt = `
// Create a **comprehensive and detailed learning roadmap** for becoming a ${targetRole}.
// Base it on the following skill gap:
// ${skillGap}

//  Important instructions:
// - Respond ONLY with valid JSON (no backticks, no markdown, no explanation).
// - Include at least 6-8 steps (phases).
// - Each step should have:
//   - "title": short clear name
//   - "duration": realistic time estimate (e.g. "2-4 weeks")
//   - "topics": a detailed list of subtopics (minimum 4–6 items)
//   - "resources": at least 3 high-quality resources (courses, books, articles, videos)
//   - "projects": at least 1–2 practical projects per step
//   - "status": default as "pending"

// Format strictly like this:

// {
//   "steps": [
//     {
//       "title": "Step Title",
//       "duration": "2-3 weeks",
//       "topics": ["Topic 1", "Topic 2", "Topic 3"],
//       "resources": ["Resource 1", "Resource 2", "Resource 3"],
//       "projects": ["Project 1"],
//       "status": "pending"
//     }
//   ]
// }
// `;

//   const response = await fetch(
//     `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
//     {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         contents: [{ parts: [{ text: prompt }] }],
//       }),
//     }
//   );

//   const data = await response.json();
//   let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

//   // Clean rawText before parsing
//   rawText = rawText
//     .replace(/```json/g, "")
//     .replace(/```/g, "")
//     .trim();

//   let parsed;
//   try {
//     parsed = JSON.parse(rawText);
//   } catch (err) {
//     console.error("Roadmap JSON parse failed:", err);

//     // Fallback: extract first valid JSON block using regex and sanitize
//     const match = rawText.match(/\{[\s\S]*\}/);
//     try {
//       const cleaned = match?.[0]
//         ?.replace(/'/g, '"')
//         ?.replace(/,\s*}/g, "}")
//         ?.replace(/,\s*]/g, "]");
//       parsed = cleaned ? JSON.parse(cleaned) : { steps: [] };
//     } catch (fallbackErr) {
//       console.error("Fallback parse also failed:", fallbackErr);
//       parsed = { steps: [] };
//     }
//   }

//   return { steps: parsed.steps || [], rawText };
// };

// // API 1: Skill Gap Analysis
// const analyzeSkillGap = async (req, res) => {
//   try {
//     const { targetRole, currentSkills } = req.body;

//     if (!targetRole || !Array.isArray(currentSkills)) {
//       return res.status(400).json({ error: "Invalid input" });
//     }

//     const gap = await getSkillGapFromModel(targetRole, currentSkills);

//     res.json({
//       gapAnalysis: gap || "No response from model",
//     });
//   } catch (err) {
//     console.error("Skill gap error:", err);
//     res.status(500).json({ error: "Failed to analyze skill gap" });
//   }
// };

// // API 2: Roadmap Creation
// const generateRoadmap = async (req, res) => {
//   try {
//     const { targetRole, currentSkills } = req.body;
//     const userId = req.user?._id;

//     if (!userId || !targetRole || !Array.isArray(currentSkills)) {
//       return res.status(400).json({ error: "Invalid input" });
//     }

//     // Step 1: Get skill gap
//     const skillGap = await getSkillGapFromModel(targetRole, currentSkills);

//     // Step 2: Get roadmap steps
//     const { steps, rawText } = await getRoadmapFromModel(targetRole, skillGap);

//     // Step 3: Save roadmap
//     const roadmap = new Roadmap({
//       userId,
//       targetRole,
//       currentSkills,
//       skillGap,
//       steps,
//       rawText,
//       progress: 0, //  initial progress
//     });

//     await roadmap.save();

//     // Step 4: Link roadmap to user
//     await User.findByIdAndUpdate(userId, {
//       $push: { roadmaps: roadmap._id },
//     });

//     res.status(201).json({ success: true, roadmap });
//   } catch (err) {
//     console.error("Roadmap creation error:", err);
//     res.status(500).json({ error: "Failed to generate roadmap" });
//   }
// };

// // API 3: Roadmap Fetch by ID
// const getRoadmapById = async (req, res) => {
//   try {
//     const userId = req.user?._id;
//     const roadmapId = req.params.id;

//     if (!userId || !roadmapId) {
//       return res.status(400).json({ error: "Missing userId or roadmapId" });
//     }

//     const roadmap = await Roadmap.findOne({ _id: roadmapId, userId });

//     if (!roadmap) {
//       return res.status(404).json({ error: "Roadmap not found" });
//     }

//     res.status(200).json({ roadmap });
//   } catch (err) {
//     console.error("Roadmap fetch by ID error:", err);
//     res.status(500).json({ error: "Failed to fetch roadmap" });
//   }
// };

// // API 4: All roadmaps for logged-in user (sidebar)
// const getUserRoadmaps = async (req, res) => {
//   try {
//     const userId = req.user?._id;
//     if (!userId) return res.status(401).json({ error: "Unauthorized" });

//     const roadmaps = await Roadmap.find({ userId })
//       .select("_id targetRole progress createdAt updatedAt")
//       .sort({ createdAt: -1 });

//     res.status(200).json({ roadmaps });
//   } catch (err) {
//     console.error("User roadmaps list error:", err);
//     res.status(500).json({ error: "Failed to fetch user roadmaps" });
//   }
// };

// // API 5: Latest roadmap for logged-in user (default load)
// const getLatestRoadmap = async (req, res) => {
//   try {
//     const userId = req.user?._id;
//     if (!userId) return res.status(401).json({ error: "Unauthorized" });

//     const roadmap = await Roadmap.findOne({ userId }).sort({ createdAt: -1 });
//     if (!roadmap) return res.status(404).json({ error: "No roadmaps found" });

//     res.status(200).json({ roadmap });
//   } catch (err) {
//     console.error("Latest roadmap fetch error:", err);
//     res.status(500).json({ error: "Failed to fetch latest roadmap" });
//   }
// };

// // API 6: Delete roadmap by ID
// const deleteRoadmapById = async (req, res) => {
//   try {
//     const userId = req.user?._id;
//     const roadmapId = req.params.id;

//     if (!userId || !roadmapId) {
//       return res.status(400).json({ error: "Missing userId or roadmapId" });
//     }

//     // Find and delete roadmap owned by this user
//     const roadmap = await Roadmap.findOneAndDelete({ _id: roadmapId, userId });

//     if (!roadmap) {
//       return res.status(404).json({ error: "Roadmap not found" });
//     }

//     // Remove roadmap reference from User document
//     await User.findByIdAndUpdate(userId, {
//       $pull: { roadmaps: roadmapId },
//     });

//     res.status(200).json({ success: true, message: "Roadmap deleted successfully" });
//   } catch (err) {
//     console.error("Roadmap delete error:", err);
//     res.status(500).json({ error: "Failed to delete roadmap" });
//   }
// };

// // API 7: Update step status & recalc progress
// const updateStepStatus = async (req, res) => {
//   try {
//     const userId = req.user?._id;
//     const { roadmapId, stepIndex, status } = req.body;

//     if (!userId || roadmapId == null || stepIndex == null || !status) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     const roadmap = await Roadmap.findOne({ _id: roadmapId, userId });
//     if (!roadmap) {
//       return res.status(404).json({ error: "Roadmap not found" });
//     }

//     // Update step status
//     if (!roadmap.steps[stepIndex]) {
//       return res.status(400).json({ error: "Invalid step index" });
//     }
//     roadmap.steps[stepIndex].status = status;

//     // Recalculate progress
//     const totalSteps = roadmap.steps.length;
//     const completedSteps = roadmap.steps.filter(s => s.status === "completed").length;
//     roadmap.progress = Math.round((completedSteps / totalSteps) * 100);

//     await roadmap.save();

//     res.status(200).json({ success: true, roadmap });
//   } catch (err) {
//     console.error("Update step status error:", err);
//     res.status(500).json({ error: "Failed to update step status" });
//   }
// };

// module.exports = {
//   analyzeSkillGap,
//   generateRoadmap,
//   getRoadmapById,
//   getUserRoadmaps,   
//   getLatestRoadmap,
//   deleteRoadmapById,
//   updateStepStatus
// };





const User = require("../models/user");
const Roadmap = require("../models/roadmap");

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// ---------- Utilities ----------

const postToGemini = async (prompt, generationConfig) => {
  const response = await fetch(
    `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        // Strongly enforce JSON output and shape
        generationConfig,
      }),
    }
  );

  const data = await response.json();

  // Basic guardrails + debug hooks
  if (!response.ok) {
    console.error("Gemini API error status:", response.status, data);
    throw new Error("Model API error");
  }
  const candidate = data?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  if (finishReason && finishReason !== "STOP") {
    console.error("Model finishReason:", finishReason, JSON.stringify(candidate, null, 2));
  }

  let rawText = candidate?.content?.parts?.[0]?.text?.trim() || "";
  // Clean fences if any slipped through
  rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

  return rawText;
};

// Normalize any array-like field to array of strings
const toStringArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (item == null) return null;
        if (typeof item === "string") return item.trim();
        if (typeof item === "number" || typeof item === "boolean") return String(item);
        if (typeof item === "object") {
          // Flatten resource objects like { title, url } to readable strings
          if (item.title && item.url) return `${item.title} - ${item.url}`;
          if (item.name && item.link) return `${item.name} - ${item.link}`;
          // Fallback to JSON string for unknown shapes
          try {
            return JSON.stringify(item);
          } catch {
            return String(item);
          }
        }
        return String(item);
      })
      .filter((s) => s && s.length > 0);
  }
  // Single string/primitive fallback
  if (typeof val === "string") return [val.trim()].filter(Boolean);
  return [String(val)];
};

// Hard validation + cleanup of roadmap steps to match DB schema
const normalizeRoadmapSteps = (steps) => {
  if (!Array.isArray(steps)) return [];

  return steps
    .map((s) => {
      const title =
        typeof s?.title === "string" && s.title.trim().length > 0 ? s.title.trim() : null;
      const duration =
        typeof s?.duration === "string" && s.duration.trim().length > 0
          ? s.duration.trim()
          : null;

      const topics = toStringArray(s?.topics);
      const resources = toStringArray(s?.resources);
      const projects = toStringArray(s?.projects);

      // Default status -> "pending"
      const status =
        typeof s?.status === "string" && s.status.trim().length > 0
          ? s.status.trim()
          : "pending";

      // Basic validity: must have a title and at least one list populated
      if (!title) return null;

      return {
        title,
        duration: duration || "1-3 weeks",
        topics: topics.length ? topics : [],
        resources: resources.length ? resources : [],
        projects: projects.length ? projects : [],
        status,
      };
    })
    .filter(Boolean);
};

// ---------- Helpers: Model calls ----------

// Skill Gap Analysis (JSON structured)
const getSkillGapFromModel = async (targetRole, currentSkills) => {
  const prompt = `
You are an expert career mentor helping someone become a ${targetRole}.
Current skills: ${currentSkills.join(", ")}.

Return ONLY valid JSON (no markdown, no backticks, no extra text).
The JSON must have exactly this structure:

{
  "missingSkills": ["Skill 1", "Skill 2", "Skill 3"],
  "learningPriorities": ["Priority 1", "Priority 2", "Priority 3"]
}

Rules:
- "missingSkills" should be a list of skills the person needs to learn.
- "learningPriorities" should be a list of priorities in order of importance.
- Do NOT include any explanation, intro, or closing text.
- Output must be strictly valid JSON.
`;

  const rawText = await postToGemini(prompt, {
    responseMimeType: "application/json",
    temperature: 0.3,
    topP: 0.9,
    topK: 32,
    maxOutputTokens: 1024,
  });

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    console.error("Skill gap JSON parse failed:", err, "\nRAW:", rawText);
    // Fallback extraction
    const match = rawText.match(/\{[\s\S]*\}/);
    try {
      const cleaned = match?.[0]
        ?.replace(/'/g, '"')
        ?.replace(/,\s*}/g, "}")
        ?.replace(/,\s*]/g, "]");
      parsed = cleaned ? JSON.parse(cleaned) : null;
    } catch (fallbackErr) {
      console.error("Skill gap fallback parse failed:", fallbackErr);
      parsed = null;
    }
  }

  // Final guard
  if (
    !parsed ||
    !parsed.missingSkills ||
    !parsed.learningPriorities ||
    !Array.isArray(parsed.missingSkills) ||
    !Array.isArray(parsed.learningPriorities)
  ) {
    return { missingSkills: [], learningPriorities: [] };
  }

  // Ensure both arrays are strings
  parsed.missingSkills = toStringArray(parsed.missingSkills);
  parsed.learningPriorities = toStringArray(parsed.learningPriorities);
  return parsed;
};

// Roadmap Generation (with bulletproof parsing + normalization)
const getRoadmapFromModel = async (targetRole, skillGap) => {
  const prompt = `
You are an expert career mentor.
Create a comprehensive and detailed learning roadmap for becoming a ${targetRole}.
Base it strictly on the following skill gap JSON:
${JSON.stringify(skillGap)}

Important instructions:
- Respond ONLY with valid JSON (no backticks, no markdown, no explanation).
- Include at least 6-8 steps (phases).
- Each step must have:
  "title": short clear name,
  "duration": realistic time estimate (e.g. "2-4 weeks"),
  "topics": a detailed list of subtopics (minimum 4–6 items),
  "resources": at least 3 high-quality resources (courses, books, articles, videos),
  "projects": at least 1–2 practical projects per step,
  "status": default as "pending"

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

  const rawText = await postToGemini(prompt, {
    responseMimeType: "application/json",
    // Optional: uncomment to push stricter schema if needed
    // responseSchema: {
    //   type: "object",
    //   properties: {
    //     steps: {
    //       type: "array",
    //       items: {
    //         type: "object",
    //         properties: {
    //           title: { type: "string" },
    //           duration: { type: "string" },
    //           topics: { type: "array", items: { type: "string" } },
    //           resources: { type: "array", items: { type: "string" } },
    //           projects: { type: "array", items: { type: "string" } },
    //           status: { type: "string" }
    //         },
    //         required: ["title", "duration", "topics", "resources", "projects", "status"],
    //         additionalProperties: true
    //       }
    //     }
    //   },
    //   required: ["steps"],
    //   additionalProperties: true
    // },
    temperature: 0.3,
    topP: 0.9,
    topK: 32,
    maxOutputTokens: 2048,
  });

  let parsed = { steps: [] };
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    console.error("Roadmap JSON parse failed:", err, "\nRAW:", rawText);
    const match = rawText.match(/\{[\s\S]*\}/);
    try {
      const cleaned = match?.[0]
        ?.replace(/'/g, '"')
        ?.replace(/,\s*}/g, "}")
        ?.replace(/,\s*]/g, "]");
      parsed = cleaned ? JSON.parse(cleaned) : { steps: [] };
    } catch (fallbackErr) {
      console.error("Roadmap fallback parse failed:", fallbackErr);
      parsed = { steps: [] };
    }
  }

  // Normalize strictly to your DB schema (arrays of strings etc.)
  const steps = normalizeRoadmapSteps(parsed?.steps);

  return { steps, rawText };
};

// ---------- APIs ----------

// API 1: Skill Gap Analysis
const analyzeSkillGap = async (req, res) => {
  try {
    const { targetRole, currentSkills } = req.body;

    if (!targetRole || !Array.isArray(currentSkills)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const gap = await getSkillGapFromModel(targetRole, currentSkills);

    res.json({
      gapAnalysis: gap,
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

    if (!Array.isArray(steps) || steps.length < 6) {
      console.error("No/insufficient steps generated. RAW:", rawText);
      return res.status(500).json({ error: "Failed to generate roadmap" });
    }

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

    const roadmap = await Roadmap.findOneAndDelete({ _id: roadmapId, userId });

    if (!roadmap) {
      return res.status(404).json({ error: "Roadmap not found" });
    }

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

    if (!roadmap.steps[stepIndex]) {
      return res.status(400).json({ error: "Invalid step index" });
    }
    roadmap.steps[stepIndex].status = status;

    const totalSteps = roadmap.steps.length;
    const completedSteps = roadmap.steps.filter((s) => s.status === "completed").length;
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



