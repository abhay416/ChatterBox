const User = require("../models/User");

exports.getUsers = async (req, res) => {
  try {
    // Return all users except the current user
    const users = await User.find({ _id: { $ne: req.user._id } }).select("username avatar bio");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Search users by username or id (query param: q)
exports.searchUsers = async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return res.json([]);
    // If q looks like an ObjectId (24 hex chars), search by id first
    const byId = /^[0-9a-fA-F]{24}$/.test(q) ? await User.find({ _id: q }).select("username avatar bio") : [];
    if (byId.length) return res.json(byId);
    // Otherwise search by username (case-insensitive, partial)
    const users = await User.find({ username: { $regex: q, $options: "i" } }).select("username avatar bio");
    res.json(users);
  } catch (err) {
    console.error("Search users error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get followers for a user
exports.getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("followers", "username avatar bio");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.followers || []);
  } catch (err) {
    console.error("Get followers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get following for a user
exports.getFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("following", "username avatar bio");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.following || []);
  } catch (err) {
    console.error("Get following error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Follow a user
exports.followUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const currentId = req.user._id;
    console.log(`[followUser] current:${currentId} -> target:${targetId}`);
    if (targetId.toString() === currentId.toString()) return res.status(400).json({ message: "Cannot follow yourself" });

    const target = await User.findById(targetId);
    const current = await User.findById(currentId);
    if (!target || !current) return res.status(404).json({ message: "User not found" });

    const already = target.followers.some(f => f.toString() === currentId.toString());
    if (already) return res.status(400).json({ message: "Already following" });

    target.followers.push(currentId);
    current.following.push(targetId);
    await target.save();
    await current.save();

    res.json({ message: "Followed", following: true });
  } catch (err) {
    console.error("Follow user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Unfollow a user
exports.unfollowUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const currentId = req.user._id;
    console.log(`[unfollowUser] current:${currentId} -> target:${targetId}`);
    if (targetId.toString() === currentId.toString()) return res.status(400).json({ message: "Cannot unfollow yourself" });

    const target = await User.findById(targetId);
    const current = await User.findById(currentId);
    if (!target || !current) return res.status(404).json({ message: "User not found" });

    target.followers = target.followers.filter(f => f.toString() !== currentId.toString());
    current.following = current.following.filter(f => f.toString() !== targetId.toString());
    await target.save();
    await current.save();

    res.json({ message: "Unfollowed", following: false });
  } catch (err) {
    console.error("Unfollow user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get a user's public profile (with follow counts and whether current user follows them)
exports.getUserById = async (req, res) => {
  try {
    const targetId = req.params.id;
    const user = await User.findById(targetId).select("username avatar bio firstName lastName gender age profession school company mobile email followers following createdAt");
    if (!user) return res.status(404).json({ message: "User not found" });

    const profile = {
      id: user._id,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      firstName: user.firstName,
      lastName: user.lastName,
      gender: user.gender,
      age: user.age,
      profession: user.profession,
      school: user.school,
      company: user.company,
      mobile: user.mobile,
      email: user.email,
      followersCount: (user.followers || []).length,
      followingCount: (user.following || []).length,
      createdAt: user.createdAt
    };

    // if request is authenticated, indicate whether the current user follows this profile
    try {
      const authHeader = req.header("Authorization")?.replace("Bearer ", "");
      if (authHeader) {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(authHeader, process.env.JWT_SECRET);
        const currentId = decoded?.id;
        if (currentId) {
          profile.isFollowing = (user.followers || []).some(f => f.toString() === currentId.toString());
        }
      }
    } catch (e) {
      // ignore token errors; return profile without isFollowing
    }

    res.json(profile);
  } catch (err) {
    console.error("Get user profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update current user's avatar (accepts { avatar: dataUrlOrUrl })
exports.updateMyAvatar = async (req, res) => {
  try {
    const avatar = req.body?.avatar;
    if (!avatar) return res.status(400).json({ message: 'No avatar provided' });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.avatar = avatar;
    await user.save();
    res.json({ avatar: user.avatar });
  } catch (err) {
    console.error('Update avatar error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove current user's avatar
exports.removeMyAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.avatar = null;
    await user.save();
    res.json({ message: 'Avatar removed' });
  } catch (err) {
    console.error('Remove avatar error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update current user's profile (bio and username optional)
exports.updateMyProfile = async (req, res) => {
  try {
    const { bio, username } = req.body || {};
    // basic validation
    if (typeof bio === 'string' && bio.length > 500) return res.status(400).json({ message: 'Bio too long (max 500 characters)' });
    if (typeof username === 'string' && username.length > 30) return res.status(400).json({ message: 'Username too long (max 30 characters)' });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (typeof bio !== 'undefined') user.bio = bio;
    if (typeof username !== 'undefined' && username) user.username = username;
    await user.save();
    res.json({ id: user._id, username: user.username, avatar: user.avatar, bio: user.bio });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile with new fields
exports.updateUser = async (req, res) => {
  try {
    const { firstName, lastName, gender, age, profession, school, company, mobile, bio, username } = req.body || {};
    // basic validation
    if (typeof bio === 'string' && bio.length > 500) return res.status(400).json({ message: 'Bio too long (max 500 characters)' });
    if (typeof username === 'string' && username.length > 30) return res.status(400).json({ message: 'Username too long (max 30 characters)' });
    if (typeof firstName === 'string' && firstName.length > 50) return res.status(400).json({ message: 'First name too long (max 50 characters)' });
    if (typeof lastName === 'string' && lastName.length > 50) return res.status(400).json({ message: 'Last name too long (max 50 characters)' });
    if (typeof mobile === 'string' && mobile.length > 15) return res.status(400).json({ message: 'Mobile number too long (max 15 characters)' });
    if (typeof age !== 'undefined' && (age < 0 || age > 120)) return res.status(400).json({ message: 'Invalid age' });
    if (profession && !['Student', 'Employee', 'Other'].includes(profession)) return res.status(400).json({ message: 'Invalid profession' });
    if (gender && !['Male', 'Female', 'Other'].includes(gender)) return res.status(400).json({ message: 'Invalid gender' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Only allow updating own profile
    if (req.user._id.toString() !== user._id.toString()) return res.status(403).json({ message: 'Unauthorized' });

    if (typeof firstName !== 'undefined' && firstName !== '') user.firstName = firstName;
    if (typeof lastName !== 'undefined' && lastName !== '') user.lastName = lastName;
    if (typeof gender !== 'undefined' && gender !== '') user.gender = gender;
    if (typeof age !== 'undefined' && age !== '' && !isNaN(age)) user.age = parseInt(age);
    if (typeof profession !== 'undefined' && profession !== '') user.profession = profession;
    if (typeof school !== 'undefined' && school !== '') user.school = school;
    if (typeof company !== 'undefined' && company !== '') user.company = company;
    if (typeof mobile !== 'undefined' && mobile !== '') user.mobile = mobile;
    if (typeof bio !== 'undefined') user.bio = bio;
    if (typeof username !== 'undefined' && username) user.username = username;

    // Handle clearing enum fields by setting to null
    if (gender === '') user.gender = null;
    if (profession === '') user.profession = null;

    await user.save();
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      firstName: user.firstName,
      lastName: user.lastName,
      gender: user.gender,
      age: user.age,
      profession: user.profession,
      school: user.school,
      company: user.company,
      mobile: user.mobile,
      followersCount: (user.followers || []).length,
      followingCount: (user.following || []).length,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
