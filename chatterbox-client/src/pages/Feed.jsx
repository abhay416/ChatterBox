
import React, { useEffect, useState, useCallback, useRef } from "react";
import API from "../utils/api";
import PostCard from "../components/PostCard";
import { useAuth } from "../context/authContext";
import Loader from "../components/Loader";

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [imageData, setImageData] = useState(""); // base64 data URL
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [following, setFollowing] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();
  const loaderRef = useRef(null);

  const fetchPosts = async (page = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      const res = await API.get(`/posts?page=${page}&limit=10`);
      const { posts: newPosts, pagination } = res.data;

      if (append) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }

      setCurrentPage(pagination.currentPage);
      setHasMore(pagination.hasMore);
    } catch (err) {
      console.error(err);
    }
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchMorePosts = useCallback(() => {
    if (hasMore && !loadingMore) {
      fetchPosts(currentPage + 1, true);
    }
  }, [currentPage, hasMore, loadingMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loadingMore) {
          fetchMorePosts();
        }
      },
      { threshold: 1.0 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [fetchMorePosts, hasMore, loadingMore]);

  useEffect(() => {
    fetchPosts();
    fetchFollowing();
  }, [user]);

  const fetchFollowing = async () => {
    try {
      if (!user?.id) return;
      const res = await API.get(`/users/${user.id}/following`);
      const ids = (res.data || []).map(u => u._id || u.id || u);
      setFollowing(ids);
    } catch (err) {
      console.error("Error loading following list:", err);
    }
  };


  const handlePost = async e => {
    // support being called from both form submit (event) and programmatically (no event)
    if (e && e.preventDefault) e.preventDefault();
    if (!content.trim() && !imageData) return;
    try {
      const res = await API.post("/posts", { content, image: imageData });
      // Add new post to the beginning of the posts array
      setPosts(prev => [res.data, ...prev]);
      // Clear form
      setContent("");
      setImageData("");
      setImagePreview("");
    } catch (err) { console.error(err); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      // prevent newline and submit the post
      e.preventDefault();
      handlePost();
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageData(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageData("");
    setImagePreview("");
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 flex justify-center pt-20 px-4">

      <div className="w-full max-w-4xl">

        <div>
          <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">

          </h1>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 mb-6">
            <form onSubmit={handlePost}>
              <div className="relative">
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows="3"
                  placeholder={`What's on your mind, ${user?.username}?`}
                  className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
                {/* bottom-left image uploader */}
                <div className="absolute left-3 bottom-3 flex items-center gap-2">
                  <label className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-blue-500 transition flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M16 3v4M8 3v4m8 8l-3-3-2 2-3-3-4 4" />
                    </svg>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                  {imagePreview && (
                    <button type="button" onClick={removeImage} className="text-sm text-red-500 hover:text-red-700">Remove</button>
                  )}
                </div>

                <div className="flex justify-end mt-3">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 transition text-white rounded-lg font-semibold shadow-sm disabled:opacity-50"
                    disabled={!content.trim() && !imageData}
                  >
                    Post
                  </button>
                </div>
              </div>
            </form>

            {/* image preview */}
            {imagePreview && (
              <div className="mt-3">
                <img src={imagePreview} alt="preview" className="max-h-60 w-full object-cover rounded-lg" />
              </div>
            )}

          </div>


          {loading ? (
            <div className="flex justify-center mt-10"><Loader /></div>
          ) : (
            <>
              {posts.map(p => (
                <PostCard
                  key={p._id}
                  post={p}
                  isFollowingProp={following.includes(p.user?._id || p.user?.id)}
                  onDeleted={(id) => setPosts(prev => prev.filter(x => x._id !== id))}
                  onUpdated={(updatedPost) => {
                    if (updatedPost) {
                      // Update the specific post in the state
                      setPosts(prev => prev.map(item => item._id === updatedPost._id ? updatedPost : item));
                    } else {
                      // Fallback to refetching if no updated post provided
                      fetchPosts();
                    }
                  }}
                />
              ))}

              {/* Infinite scroll loader */}
              {hasMore && (
                <div ref={loaderRef} className="flex justify-center mt-10">
                  {loadingMore ? <Loader /> : (
                    <div className="text-gray-500 dark:text-gray-400">
                      Scroll to load more posts...
                    </div>
                  )}
                </div>
              )}

              {/* No more posts message */}
              {!hasMore && posts.length > 0 && (
                <div className="text-center mt-10 text-gray-500 dark:text-gray-400">
                  You've reached the end! 🎉
                </div>
              )}

              {/* Empty state */}
              {posts.length === 0 && !loading && (
                <div className="text-center mt-10 text-gray-500 dark:text-gray-400">
                  No posts yet. Be the first to post something! 🚀
                </div>
              )}
            </>
          )}

        </div>



      </div>

    </div>
  );
}
