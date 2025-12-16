import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../utils/api";
import ProfileCard from "../components/ProfileCard";
import PostCard from "../components/PostCard";

export default function Profile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);




  const fetchProfileAndPosts = async () => {
    try {
      setLoading(true);

      let postsData = [];
      let profileData = null;

      // Try to fetch profile first
      try {
        const resProfile = await API.get(`/users/${id}`);
        profileData = resProfile.data;
      } catch (profileErr) {
        console.warn("Could not fetch profile:", profileErr);
        // Set fallback profile
        profileData = {
          username: "Unknown User",
          bio: "",
          id: id,
          avatar: null
        };
      }

      // Only try to fetch posts if we have a token and profile was loaded successfully
      const token = localStorage.getItem("chatter_token");
      if (token && profileData && profileData.username !== "Unknown User") {
        try {
          const resPosts = await API.get(`/posts/user/${id}`);
          // Backend returns { posts, pagination }, so extract posts array
          postsData = (resPosts.data?.posts) || resPosts.data || [];
        } catch (postErr) {
          console.warn("Could not fetch user posts:", postErr);
          postsData = []; // Empty array is fine, we'll just show no posts
        }
      }

      setPosts(postsData);
      setProfile(profileData);
    } catch (err) {
      console.error("Profile fetch error:", err);
      // Ensure we always have a fallback state
      if (!profile) {
        setProfile({
          username: "Unknown User",
          bio: "",
          id: id,
          avatar: null
        });
        setPosts([]);
      }
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    // Reset state when ID changes
    setProfile(null);
    setPosts([]);
    setLoading(true);

    // Fetch profile and posts
    fetchProfileAndPosts();
  }, [id]);

  // handler passed to ProfileCard to refresh when profile data changed
  const handleProfileUpdated = async (newProfile) => {
    // refetch server data to keep posts/profile in sync
    await fetchProfileAndPosts();
  };

  // Handler when a post is deleted
  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(p => p._id !== postId));
  };

  // Handler when a post is updated (e.g., likes, comments)
  const handlePostUpdated = (updatedPost) => {
    setPosts(prev => prev.map(p => p._id === updatedPost._id ? updatedPost : p));
  };


  // Show loading state
  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 px-4">
        <div className="container mx-auto max-w-6xl flex justify-center items-center">
          <div className="text-gray-500 dark:text-gray-400">Loading profile...</div>
        </div>
      </div>
    );
  }

  // Show error state if profile is still null after loading
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 px-4">
        <div className="container mx-auto max-w-6xl flex justify-center items-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Profile not found</h2>
            <p className="text-gray-500 dark:text-gray-400">The user profile you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Posts</h2>
            {loading ? (
              <div className="text-center text-gray-500 dark:text-gray-400">Loading posts...</div>
            ) : posts.length > 0 ? (
              posts.map(p => <PostCard key={p._id} post={p} onDeleted={handlePostDeleted} onUpdated={handlePostUpdated} />)
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                {profile.username === "Unknown User" ? "This user has no posts" : "No posts yet"}
              </div>
            )}
          </div>
          <aside className="lg:col-span-1">
            <ProfileCard user={profile} onUpdated={handleProfileUpdated} />
          </aside>
        </div>
      </div>
    </div>
  );
}
