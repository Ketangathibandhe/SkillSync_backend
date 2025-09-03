const express = require("express");
const { userAuth } = require("../middleware/auth");
const {
  analyzeSkillGap,
  generateRoadmap,
  getRoadmapById,
  getUserRoadmaps,
  getLatestRoadmap,
  deleteRoadmapById, 
  updateStepStatus
} = require("../controllers/skillController");

const router = express.Router();

// Skill Gap Analysis
router.post("/skill-gap", userAuth, analyzeSkillGap);

// Roadmap Generation
router.post("/roadmap", userAuth, generateRoadmap);

// Roadmap Fetch by ID (detail view)
router.get("/roadmap/:id", userAuth, getRoadmapById);

// All roadmaps for logged-in user (sidebar list)
router.get("/roadmaps", userAuth, getUserRoadmaps);

// Latest roadmap for logged-in user (default load)
router.get("/roadmaps/latest", userAuth, getLatestRoadmap);

// Delete roadmap by ID
router.delete("/roadmap/:id", userAuth, deleteRoadmapById);


router.put("/roadmap/step-status", userAuth, updateStepStatus);
module.exports = router;