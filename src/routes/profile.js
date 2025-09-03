const express = require("express");
const profileRouter = express.Router();
const { userAuth } = require("../middleware/auth");
const { validateEditProfileData } = require("../utils/validation.js");
const User = require("../models/user");
const validator = require("validator");
const bcrypt = require("bcrypt");
profileRouter.post("/set-role", userAuth, async (req, res) => {
  try {
    const { targetRole } = req.body;
    await User.findByIdAndUpdate(req.user._id, { targetRole });
    res.json({ message: "Target role updated!" });
  } catch (error) {
    res.send("something went wrong.." + error.message);
  }
});

profileRouter.post("/add-skills", userAuth, async (req, res) => {
  try {
    const { currentSkills } = req.body; // ["HTML","CSS","JS"]
    await User.findByIdAndUpdate(req.user._id, { currentSkills });
    res.json({ message: "Skills updated!" });
  } catch (error) {
    res.send("something went wrong.." + error.message);
  }
});

profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    const user = req.user;
    res.send(user);
  } catch (err) {
    res.status(400).send("Error :" + err.message);
  }
});

profileRouter.put("/profile/edit", userAuth, async (req, res) => {
  try {
    if (!validateEditProfileData(req)) {
      throw new Error("Invalid Edit Request!");
    }

    const loggedInUser = req.user;
    Object.keys(req.body).forEach((key) => (loggedInUser[key] = req.body[key]));
    await loggedInUser.save();
    res.json({
      message: "Profile updated successfully",
      data: loggedInUser,
    });
    console.log("Incoming PUT /profile/edit request:", req.body);
  } catch (err) {
    res.status(400).send("Error :" + err.message);
  }
});

profileRouter.put("/profile/forgotPassword", async (req, res) => {
  try {
    const { emailId, password } = req.body;
    // Validate input
    if (!emailId || !password) {
      return res.status(400).send("Email and password are required");
    }
    // Find user by email
    const user = await User.findOne({ emailId });
    if (!user) {
      return res
        .status(200)
        .send("If the account exists, password has been reset."); // Don't reveal if user exists
    }

    if (!validator.isStrongPassword(password)) {
      throw new Error("Enter a strong password : " + password + " is too weak");
    } else {
      // Hash new password
      var passwordHash = await bcrypt.hash(password, 10);
    }

    // Update password
    user.password = passwordHash;
    await user.save();

    res.send("Password reset successful");
  } catch (err) {
    res.status(500).send("Error :" + err.message);
  }
});
module.exports = profileRouter;
