const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  bio: { type: String, default: "" },
  avatar: { type: String, default: "" }, // URL (Cloudinary or local)
  firstName: { type: String, default: "" },
  lastName: { type: String, default: "" },
  gender: { type: String, enum: ["Male", "Female", "Other"], default: undefined },
  age: { type: Number, min: 0, max: 120 },
  profession: { type: String, enum: ["Student", "Employee", "Other"], default: undefined },
  school: { type: String, default: "" },
  company: { type: String, default: "" },
  mobile: { type: String, default: "" },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
