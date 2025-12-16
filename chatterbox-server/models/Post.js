const mongoose = require("mongoose");

const replySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: String,
  createdAt: { type: Date, default: Date.now },
  replies: []
});

// allow nested replies by adding replies array that uses the same schema
replySchema.add({ replies: [replySchema] });

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: String,
  createdAt: { type: Date, default: Date.now },
  replies: [replySchema]
});


const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, trim: true, maxlength: 2000 },
  image: { type: String, default: "" }, // optional image URL
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now }
});

// Add indexes for performance optimization
postSchema.index({ createdAt: -1 }); // For feed queries
postSchema.index({ user: 1 }); // For user-specific posts
postSchema.index({ likes: 1 }); // For like-based queries
postSchema.index({ createdAt: -1, user: 1 }); // Compound index for user posts

module.exports = mongoose.model("Post", postSchema);
