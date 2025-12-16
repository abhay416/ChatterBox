const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  createPost,
  getFeed,
  deletePost,
  toggleLike,
  addComment,
  addReply,
  addReplyToReply,
  deleteReply,
  deleteComment,
  getUserPosts
} = require("../controllers/postController");

router.get("/", auth, getFeed);
router.post("/", auth, createPost);
router.delete("/:id", auth, deletePost);
router.put("/like/:id", auth, toggleLike);
router.post("/comment/:id", auth, addComment);
router.post("/comment/:postId/:commentId/reply", auth, addReply);
router.post("/comment/:postId/:commentId/reply/:replyId", auth, addReplyToReply);
router.delete("/comment/:postId/:commentId", auth, deleteComment);
router.delete("/comment/:postId/:commentId/reply/:replyId", auth, deleteReply);
router.get("/user/:userId", auth, getUserPosts);

module.exports = router;
