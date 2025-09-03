const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      minLength: 3,
      maxLength: 20,
    },
    lastName: {
      type: String,
      required: true,
    },
    emailId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate(value) {
        const validator = require("validator");
        if (!validator.isEmail(value)) {
          throw new Error("Email is not valid:" + value);
        }
      },
    },
    password: {
      type: String,
      required: true,
      validate(value) {
        var validator = require("validator");
        if (!validator.isStrongPassword(value)) {
          throw new Error("Enter Strong password" + value);
        }
      },
    },
    age: {
      type: Number,
      min: 18,
      default: 18,
    },
    gender: {
      type: String,

      validate: function (value) {
        const normalized = value?.toLowerCase();
        if (!["male", "female", "other"].includes(normalized)) {
          throw new Error("Gender data is not valid");
        }
      },
    },
    photoUrl: {
      type: String,
      default: "https://wallpapercave.com/wp/wp12696557.jpg",
    },
    about: {
      type: String,
      default: "I am using SkillSync app",
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.getJWT = async function () {
  const user = this;
  const token = await jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "8d",
  });
  return token;
};

userSchema.methods.validatePassword = async function (password) {
  const user = this;
  const passwordHash = user.password;
  const isPasswordValid = await bcrypt.compare(password, passwordHash);
  return isPasswordValid;
};

module.exports = mongoose.model("User", userSchema);
