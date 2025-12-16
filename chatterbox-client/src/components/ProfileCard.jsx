import React, { useState, useEffect } from "react";
import Avatar from "./Avatar";
import { useAuth } from "../context/authContext";
import API from "../utils/api";

export default function ProfileCard({ user = {}, onUpdated }) {
  const { user: currentUser, setUser: setAuthUser } = useAuth(); // uses setUser if available
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    bio: user.bio || "",
    email: user.email || "",
    firstName: user.firstName || "",
    gender: user.gender || "",
    age: user.age || "",
    profession: user.profession || "",
    school: user.school || "",
    company: user.company || "",
    mobile: user.mobile || "",
  });

  useEffect(() => {
    setFormData({
      bio: user.bio || "",
      email: user.email || "",
      firstName: user.firstName || "",
      gender: user.gender || "",
      age: user.age || "",
      profession: user.profession || "",
      school: user.school || "",
      company: user.company || "",
      mobile: user.mobile || "",
    });
  }, [user]);

  // normalize ids and compute ownership robustly
  const authId = currentUser?.id || currentUser?._id || null;
  const profileId = user?.id || user?._id || null;
  const isOwnProfile = Boolean(authId && profileId && String(authId) === String(profileId));

  const handleChange = (e) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // guard - do not allow non-owners to submit
    if (!isOwnProfile) {
      alert("You are not authorized to edit this profile.");
      return;
    }

    try {
      setIsLoading(true);
      const idToUse = profileId;
      if (!idToUse) throw new Error("Unable to determine user id for update.");

      // send update to backend
      const response = await API.put(`/users/${idToUse}`, formData);

      // If backend returns updated user object, update auth context as well (so navbar/profile updates)
      if (response?.data) {
        // If response.data is the updated user object
        if (setAuthUser && isOwnProfile) {
          // keep token in localStorage; update stored user object
          setAuthUser((prev) => ({ ...(prev || {}), ...response.data }));
          // Also update localStorage if your AuthContext persists user that way
          try {
            localStorage.setItem("chatter_user", JSON.stringify({ ...(currentUser || {}), ...(response.data || {}) }));
          } catch (e) { /* ignore */ }
        }
        onUpdated && onUpdated(response.data);
      }

      setIsEditing(false);
      alert("Profile updated successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile. Please check if you are logged in and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Icon components
  const PersonIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  const CalendarIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  const BriefcaseIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4m0 0L4 7m8-4v10m0-10L4 7v10a2 2 0 002 2h12a2 2 0 002-2V7m-8 4v6m0 0v2m0-2a2 2 0 11-4 0m4 0a2 2 0 11-4 0m4 0v2m-6-2a2 2 0 111-4 2 2 0 01-1 4" />
    </svg>
  );

  const PhoneIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 00.948.684l1.498 7.492a1 1 0 00.502.84l2.32 1.39c.26-.195.721-.17.896.212l1.734 3.468c.335.67-.235 1.4-.9 1.4H7a1 1 0 00-.894.553l-1.448 2.894a1 1 0 00.502 1.21l2.257 1.13a1 1 0 00.934-.271l6.305-5.286a1 1 0 00.242-1.023l-.97-4.849a1 1 0 00-.263-.540L10.571 10.591a1 1 0 00-.923-.067l-2.468 1.234a1 1 0 00-.39 1.549l1.13 1.697a1 1 0 00.563.436l2.385.713a1 1 0 00.884-.197l2.77-2.08a1 1 0 00.193-.1l1.133-.85a1 1 0 00.158-1.54l-1.43-1.43z" />
    </svg>
  );

  const HeartIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );

  const EmailIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );

  return (
    <div className="space-y-6">
      {/* Header Profile Card - Glass Morphism */}
      <div className="relative backdrop-blur-xl bg-white/10 dark:bg-gray-800/20 rounded-2xl border border-white/20 dark:border-gray-700/30 p-6 overflow-hidden group hover:border-white/40 dark:hover:border-gray-600/50 transition-all duration-300">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 dark:from-blue-500/10 dark:via-indigo-500/10 dark:to-purple-500/10 -z-10" />

        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

        {/* Profile Header Section */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            {/* Avatar with glow effect */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-400 rounded-full blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-300" />
              <Avatar user={user} size={80} className="relative ring-2 ring-white dark:ring-gray-700" />
            </div>

            {/* User Info */}
            <div className="flex-1 pt-1">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                {user.username || "User"}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1 line-clamp-2">
                {user.bio || "No bio added yet"}
              </p>
            </div>
          </div>

          {/* Edit Button */}
          {isOwnProfile && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/50 active:scale-95 ml-2 flex-shrink-0"
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
          )}
        </div>

        {/* Stats Section - Animated Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Followers Card */}
          <div className="group/stat relative backdrop-blur-md bg-gradient-to-br from-blue-400/10 to-indigo-400/10 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-xl p-4 border border-blue-200/20 dark:border-blue-500/20 hover:border-blue-300/40 dark:hover:border-blue-400/40 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-indigo-500/0 group-hover/stat:from-blue-500/5 group-hover/stat:to-indigo-500/5 transition-all duration-300 -z-10" />
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/20 group-hover/stat:bg-blue-500/30 transition-colors duration-300">
                <HeartIcon />
              </div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Followers</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{user.followersCount ?? 0}</p>
          </div>

          {/* Following Card */}
          <div className="group/stat relative backdrop-blur-md bg-gradient-to-br from-purple-400/10 to-pink-400/10 dark:from-purple-500/10 dark:to-pink-500/10 rounded-xl p-4 border border-purple-200/20 dark:border-purple-500/20 hover:border-purple-300/40 dark:hover:border-purple-400/40 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover/stat:from-purple-500/5 group-hover/stat:to-pink-500/5 transition-all duration-300 -z-10" />
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-purple-500/20 group-hover/stat:bg-purple-500/30 transition-colors duration-300">
                <PersonIcon />
              </div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Following</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{user.followingCount ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Detailed Profile Section - Modern Card */}
      <div className="relative backdrop-blur-xl bg-white/10 dark:bg-gray-800/20 rounded-2xl border border-white/20 dark:border-gray-700/30 p-6 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-pink-500/10 -z-10" />

        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

        {/* Section Header */}
        <h3 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-6">
          {isEditing ? "Edit Profile" : "Profile Information"}
        </h3>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Section */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Basic Information</p>

              <div className="relative group">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                <div className="relative">
                  <div className="absolute left-3 top-3 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300">
                    <PersonIcon />
                  </div>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent dark:focus:ring-blue-400/50 transition-all duration-300 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact Details</p>

              <div className="relative group">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <div className="relative">
                  <div className="absolute left-3 top-3 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-300">
                    <EmailIcon />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent dark:focus:ring-indigo-400/50 transition-all duration-300 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="relative group">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mobile Number</label>
                <div className="relative">
                  <div className="absolute left-3 top-3 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-300">
                    <PhoneIcon />
                  </div>
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="+1 (555) 123-4567"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent dark:focus:ring-indigo-400/50 transition-all duration-300 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Demographics Section */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Demographics</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative group">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gender</label>
                  <div className="relative">
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent dark:focus:ring-purple-400/50 transition-all duration-300 text-gray-900 dark:text-gray-100 appearance-none cursor-pointer"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="relative group">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Age</label>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-300">
                      <CalendarIcon />
                    </div>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      placeholder="25"
                      min="0"
                      max="120"
                      className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent dark:focus:ring-purple-400/50 transition-all duration-300 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Section */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Professional</p>

              <div className="relative group">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Profession</label>
                <div className="relative">
                  <select
                    name="profession"
                    value={formData.profession}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent dark:focus:ring-purple-400/50 transition-all duration-300 text-gray-900 dark:text-gray-100 appearance-none cursor-pointer"
                  >
                    <option value="">Select Profession</option>
                    <option value="Student">Student</option>
                    <option value="Employee">Employee</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {formData.profession === "Student" && (
                <div className="relative group animate-slideIn">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">School/College</label>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-300">
                      <BriefcaseIcon />
                    </div>
                    <input
                      type="text"
                      name="school"
                      value={formData.school}
                      onChange={handleChange}
                      placeholder="University Name"
                      className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent dark:focus:ring-purple-400/50 transition-all duration-300 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    />
                  </div>
                </div>
              )}

              {formData.profession === "Employee" && (
                <div className="relative group animate-slideIn">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Name</label>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-300">
                      <BriefcaseIcon />
                    </div>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="Company Name"
                      className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent dark:focus:ring-purple-400/50 transition-all duration-300 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bio Section */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">About</p>

              <div className="relative group">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself..."
                  rows="4"
                  className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent dark:focus:ring-pink-400/50 transition-all duration-300 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-white/10 dark:border-gray-700/30">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 relative group px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/50 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Basic Information</p>

              <div className="group p-3 rounded-lg bg-white/30 dark:bg-gray-700/30 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-300 border border-white/10 dark:border-gray-600/20 hover:border-blue-200 dark:hover:border-blue-500/30 cursor-default">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Name</p>
                <p className="text-gray-900 dark:text-gray-100 font-medium flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-300">{user.firstName || "Not provided"}</span>
                </p>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact Details</p>

              <div className="group p-3 rounded-lg bg-white/30 dark:bg-gray-700/30 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-300 border border-white/10 dark:border-gray-600/20 hover:border-indigo-200 dark:hover:border-indigo-500/30 cursor-default">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                  <span className="text-indigo-500">
                    <EmailIcon />
                  </span>
                  Email
                </p>
                <p className="text-gray-900 dark:text-gray-100 font-medium">{user.email || "Not provided"}</p>
              </div>

              <div className="group p-3 rounded-lg bg-white/30 dark:bg-gray-700/30 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-300 border border-white/10 dark:border-gray-600/20 hover:border-indigo-200 dark:hover:border-indigo-500/30 cursor-default">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                  <span className="text-indigo-500">
                    <PhoneIcon />
                  </span>
                  Mobile Number
                </p>
                <p className="text-gray-900 dark:text-gray-100 font-medium">{user.mobile || "Not provided"}</p>
              </div>
            </div>

            {/* Demographics */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Demographics</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group p-3 rounded-lg bg-white/30 dark:bg-gray-700/30 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-300 border border-white/10 dark:border-gray-600/20 hover:border-purple-200 dark:hover:border-purple-500/30 cursor-default">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Gender</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{user.gender || "Not provided"}</p>
                </div>
                <div className="group p-3 rounded-lg bg-white/30 dark:bg-gray-700/30 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-300 border border-white/10 dark:border-gray-600/20 hover:border-purple-200 dark:hover:border-purple-500/30 cursor-default">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <span className="text-purple-500">
                      <CalendarIcon />
                    </span>
                    Age
                  </p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{user.age || "Not provided"}</p>
                </div>
              </div>
            </div>

            {/* Professional */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Professional</p>

              <div className="group p-3 rounded-lg bg-white/30 dark:bg-gray-700/30 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-300 border border-white/10 dark:border-gray-600/20 hover:border-purple-200 dark:hover:border-purple-500/30 cursor-default">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                  <span className="text-purple-500">
                    <BriefcaseIcon />
                  </span>
                  Profession
                </p>
                <p className="text-gray-900 dark:text-gray-100 font-medium">{user.profession || "Not provided"}</p>
              </div>

              {user.profession === "Student" && (
                <div className="group p-3 rounded-lg bg-white/30 dark:bg-gray-700/30 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-300 border border-white/10 dark:border-gray-600/20 hover:border-purple-200 dark:hover:border-purple-500/30 cursor-default animate-slideIn">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">School/College</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{user.school || "Not provided"}</p>
                </div>
              )}

              {user.profession === "Employee" && (
                <div className="group p-3 rounded-lg bg-white/30 dark:bg-gray-700/30 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-300 border border-white/10 dark:border-gray-600/20 hover:border-purple-200 dark:hover:border-purple-500/30 cursor-default animate-slideIn">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Company Name</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{user.company || "Not provided"}</p>
                </div>
              )}
            </div>

            {/* Bio */}
            {/* {user.bio && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">About</p>
                <div className="p-4 rounded-lg bg-gradient-to-br from-pink-400/10 to-rose-400/10 dark:from-pink-500/10 dark:to-rose-500/10 border border-pink-200/20 dark:border-pink-500/20">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{user.bio}</p>
                </div>
              </div>
            )} */}
          </div>
        )}
      </div>
    </div>
  );
}

