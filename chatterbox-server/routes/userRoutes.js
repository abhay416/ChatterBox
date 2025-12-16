const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { getUsers, searchUsers, getFollowers, getFollowing, followUser, unfollowUser, getUserById, updateMyAvatar, removeMyAvatar, updateMyProfile, updateUser } = require("../controllers/userController");

router.get("/", auth, getUsers);
router.get("/search", auth, searchUsers);
router.get("/:id/followers", auth, getFollowers);
router.get("/:id/following", auth, getFollowing);
router.post("/:id/follow", auth, followUser);
router.post("/:id/unfollow", auth, unfollowUser);
router.get("/:id", getUserById);
router.put("/:id", auth, updateUser);
// avatar management for current user
router.put('/me/avatar', auth, updateMyAvatar);
router.delete('/me/avatar', auth, removeMyAvatar);
// update profile (bio/username)
router.put('/me', auth, updateMyProfile);

module.exports = router;
