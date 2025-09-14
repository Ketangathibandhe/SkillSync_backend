// const express = require("express");
// const User = require("../models/user");
// const authRouter = express.Router();
// const { validateSignUpData } = require("../utils/validation");
// const bcrypt = require("bcrypt");

// //  Common cookie config
// const cookieOptions = {
//   httpOnly: true,
//   secure: true,
//   sameSite: "None",
//   path: "/",
//   maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
// };


// //  SIGNUP
// authRouter.post("/signup", async (req, res) => {
//   try {
//     validateSignUpData(req);

//     const { firstName, lastName, emailId, password } = req.body;
//     const passwordHash = await bcrypt.hash(password, 10);

//     const user = new User({
//       firstName,
//       lastName,
//       emailId,
//       password: passwordHash,
//     });

//     const savedUser = await user.save();
//     const token = await savedUser.getJWT();

//     res.cookie("token", token, cookieOptions);
//     res.json({ message: "User added successfully!", data: savedUser });
//   } catch (error) {
//     res.status(400).send(error.message);
//   }
// });

// //  LOGIN
// authRouter.post("/login", async (req, res) => {
//   try {
//     const { emailId, password } = req.body;
//     const user = await User.findOne({ emailId });

//     if (!user) throw new Error("Invalid credentials");

//     const isPasswordValid = await user.validatePassword(password);
//     if (!isPasswordValid) throw new Error("Invalid credentials");

//     const token = await user.getJWT();
//     res.cookie("token", token, cookieOptions);
//     res.json({ message: "Logged in successfully!", user });
//   } catch (error) {
//     res.status(400).send("Login failed: " + error.message);
//   }
// });

// //  LOGOUT
// authRouter.post("/logout", async (req, res) => {
//   try {
//     res.clearCookie("token", cookieOptions);
//     res.status(200).send("Logged out successfully..");
//   } catch (error) {
//     res.status(400).send("Logout failed: " + error.message);
//   }
// });

// module.exports = authRouter;


const express = require("express");
const User = require("../models/user");
const authRouter = express.Router();
const { validateSignUpData } = require("../utils/validation");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Common cookie config
const cookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: "None",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// SIGNUP
authRouter.post("/signup", async (req, res) => {
  try {
    validateSignUpData(req);

    const { firstName, lastName, emailId, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
    });

    const savedUser = await user.save();
    const token = await savedUser.getJWT();

    res.cookie("token", token, cookieOptions);
    res.json({ message: "User added successfully!", data: savedUser });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

// LOGIN
authRouter.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body;
    const user = await User.findOne({ emailId });

    if (!user) throw new Error("Invalid credentials");

    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) throw new Error("Invalid credentials");

    const token = await user.getJWT();
    res.cookie("token", token, cookieOptions);
    res.json({ message: "Logged in successfully!", user });
  } catch (error) {
    res.status(400).send("Login failed: " + error.message);
  }
});

// LOGOUT
authRouter.post("/logout", async (req, res) => {
  try {
    res.clearCookie("token", cookieOptions);
    res.status(200).send("Logged out successfully..");
  } catch (error) {
    res.status(400).send("Logout failed: " + error.message);
  }
});

//  CHECK AUTH (for session verification on reload)
authRouter.get("/check-auth", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "No token found" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "Invalid token" });

    res.json(user);
  } catch (error) {
    res.status(401).json({ message: "Auth failed" });
  }
});

module.exports = authRouter;