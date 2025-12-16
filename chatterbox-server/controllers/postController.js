const Post = require("../models/Post");
const User = require("../models/User");

exports.createPost = async (req, res) => {
  try {
    const { content, image } = req.body;
    if (!content && !image) return res.status(400).json({ message: "Post cannot be empty" });
    const post = new Post({ user: req.user._id, content, image: image || "" });
    await post.save();
    const populated = await post.populate("user", "username avatar");
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


exports.getFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Use lean() for better performance when we don't need mongoose documents
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username avatar")
      .populate("comments.user", "username avatar")
      .lean(); // Performance boost
    
    // Get total count for pagination info (separate query for better performance)
    const total = await Post.countDocuments();
    
    res.json({
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasMore: skip + posts.length < total
      }
    });
  } catch (err) {
    console.error("Get feed error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized" });
    await post.deleteOne();
    res.json({ message: "Post removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const likedIndex = post.likes.findIndex(id => id.toString() === req.user._id.toString());
    if (likedIndex === -1) {
      post.likes.push(req.user._id);
    } else {
      post.likes.splice(likedIndex, 1);
    }
    await post.save();
    // Return the entire updated post with populated data
    const updatedPost = await Post.findById(req.params.id).populate("user", "username avatar").populate("comments.user", "username avatar");
    res.json(updatedPost);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Comment cannot be empty" });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.comments.push({ user: req.user._id, text });
    await post.save();
    // Return the entire updated post with populated data
    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "username avatar")
      .populate("comments.user", "username avatar")
      .populate("comments.replies.user", "username avatar");
    res.json(updatedPost);
  } catch (err) {
    console.error("Add comment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.addReply = async (req, res) => {
  try {
    const { text } = req.body;
    const { postId, commentId } = req.params;
    if (!text) return res.status(400).json({ message: "Reply cannot be empty" });
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    comment.replies.push({ user: req.user._id, text });
    await post.save();
    const updatedPost = await Post.findById(postId)
      .populate("user", "username avatar")
      .populate("comments.user", "username avatar")
      .populate("comments.replies.user", "username avatar");
    res.json(updatedPost);
  } catch (err) {
    console.error("Add reply error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Add a reply to a nested reply (recursive). Finds parent reply anywhere under the comment.
exports.addReplyToReply = async (req, res) => {
  try {
    const { text } = req.body;
    const { postId, commentId, replyId } = req.params;
    if (!text) return res.status(400).json({ message: "Reply cannot be empty" });
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // recursive search for the reply by id inside comment.replies
    const findReplyRecursive = (replies) => {
      for (let r of replies) {
        if (r._id.toString() === replyId.toString()) return r;
        if (r.replies && r.replies.length) {
          const found = findReplyRecursive(r.replies);
          if (found) return found;
        }
      }
      return null;
    };

    const parentReply = findReplyRecursive(comment.replies);
    if (!parentReply) return res.status(404).json({ message: "Parent reply not found" });

    // push new nested reply
    parentReply.replies.push({ user: req.user._id, text });
    await post.save();

    // populate several nested levels (up to 3) to return users for UI
    const updatedPost = await Post.findById(postId)
      .populate("user", "username avatar")
      .populate("comments.user", "username avatar")
      .populate("comments.replies.user", "username avatar")
      .populate("comments.replies.replies.user", "username avatar")
      .populate("comments.replies.replies.replies.user", "username avatar");

    res.json(updatedPost);
  } catch (err) {
    console.error("Add reply-to-reply error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteReply = async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    // try to remove reply at any nesting level under this comment
    let removed = false;

    const removeRecursive = (replies) => {
      for (let i = replies.length - 1; i >= 0; i--) {
        const r = replies[i];
        if (r._id.toString() === replyId.toString()) {
          // authorization: only author can delete
          if (r.user.toString() !== req.user._id.toString()) throw { status: 403, message: 'Not authorized' };
          replies.splice(i, 1);
          removed = true;
          return true;
        }
        if (r.replies && r.replies.length) {
          const found = removeRecursive(r.replies);
          if (found) return true;
        }
      }
      return false;
    };

    try {
      removeRecursive(comment.replies);
    } catch (authErr) {
      return res.status(authErr.status || 403).json({ message: authErr.message || 'Not authorized' });
    }

    if (!removed) return res.status(404).json({ message: "Reply not found" });
    await post.save();
    const updatedPost = await Post.findById(postId)
      .populate("user", "username avatar")
      .populate("comments.user", "username avatar")
      .populate("comments.replies.user", "username avatar");
    res.json(updatedPost);
  } catch (err) {
    console.error("Delete reply error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const commentIndex = post.comments.findIndex(comment => comment._id.toString() === req.params.commentId);
    if (commentIndex === -1) return res.status(404).json({ message: "Comment not found" });
    if (post.comments[commentIndex].user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized" });
    post.comments.splice(commentIndex, 1);
    await post.save();
    // Return the entire updated post with populated data
    const updatedPost = await Post.findById(req.params.postId).populate("user", "username avatar").populate("comments.user", "username avatar");
    res.json(updatedPost);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


exports.getUserPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Use lean() for better performance
    const posts = await Post.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username avatar")
      .populate("comments.user", "username avatar")
      .lean();
    
    // Get total count for pagination info
    const total = await Post.countDocuments({ user: req.params.userId });
    
    res.json({
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasMore: skip + posts.length < total
      }
    });
  } catch (err) {
    console.error("Get user posts error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
