import React, { useState, useEffect, memo } from "react";
import API from "../utils/api";
import { useAuth } from "../context/authContext";
import { motion } from "framer-motion";
import Avatar from "./Avatar";
import { useNavigate } from 'react-router-dom';

// Optimized ReplyNode component (memoized and moved outside)
const ReplyNode = memo(function ReplyNode({
  reply,
  commentId,
  depth = 0,
  parentUser = null,
  replyTextMap,
  setReplyTextMap,
  showReplyInputMap,
  setShowReplyInputMap,
  handleAddReplyToReply,
  handleDeleteReply,
  user
}) {
  const key = reply._id;
  const navigate = useNavigate();

  const handleReplySubmit = (e) => {
    e.preventDefault();
    handleAddReplyToReply(commentId, key);
  };

  const handleReplyChange = (e) => {
    setReplyTextMap(prev => ({ ...prev, [key]: e.target.value }));
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handleDeleteClick = () => {
    handleDeleteReply(commentId, reply._id);
  };

  const handleAvatarClick = () => navigate(`/profile/${reply.user?._id || reply.user?.id}`);
  const handleUsernameClick = () => navigate(`/profile/${reply.user?._id || reply.user?.id}`);

  return (
    <div style={{ marginLeft: depth * 16 }} className={`mt-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg`}>
      <div className="flex items-start gap-2">
        <Avatar user={reply.user} size={24} onClick={handleAvatarClick} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <button onClick={handleUsernameClick} className="font-semibold text-xs text-gray-900 dark:text-gray-100 text-left">
              {reply.user?.username}
            </button>
            {parentUser?.username && (
              <div className="text-gray-500 dark:text-gray-400 text-xs">replied to <span className="font-medium text-gray-700 dark:text-gray-200">@{parentUser.username}</span></div>
            )}
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm">{reply.text}</p>
          <div className="flex items-center gap-2 mt-1">
            <small className="text-gray-500 dark:text-gray-400 text-xs">{new Date(reply.createdAt).toLocaleString()}</small>
            <button onClick={() => setShowReplyInputMap(prev => ({ ...prev, [key]: !prev[key] }))} className="text-gray-500 hover:text-blue-500 transition p-1 rounded" aria-label="Reply to reply" title="Reply">
              ↩
            </button>
            {user && reply.user && (user.id === reply.user._id) && (
              <button onClick={handleDeleteClick} className="text-red-500 hover:text-red-700 transition p-1 rounded" aria-label="Delete reply" title="Delete reply">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m5 4v6m4-6v6M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>

          {/* nested replies */}
          {reply.replies?.map(child => (
            <ReplyNode
              key={child._id}
              reply={child}
              commentId={commentId}
              depth={depth + 1}
              parentUser={reply.user}
              replyTextMap={replyTextMap}
              setReplyTextMap={setReplyTextMap}
              showReplyInputMap={showReplyInputMap}
              setShowReplyInputMap={setShowReplyInputMap}
              handleAddReplyToReply={handleAddReplyToReply}
              handleDeleteReply={handleDeleteReply}
              user={user}
            />
          ))}

          {/* reply input for this reply */}
          {showReplyInputMap[key] && (
            <form onSubmit={handleReplySubmit} className="mt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyTextMap[key] || ""}
                  onChange={handleReplyChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Write a reply..."
                  className="flex-1 p-2 rounded-lg bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <button type="submit" disabled={!(replyTextMap[key] && replyTextMap[key].trim())} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Reply</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
});

const PostCard = memo(function PostCard({ post, onDeleted, onUpdated, isFollowingProp = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [likes, setLikes] = useState(post.likes?.length || 0);
  const [liked, setLiked] = useState(post.likes?.some(id => id === user?.id));
  const [isFollowing, setIsFollowing] = useState(Boolean(isFollowingProp));
  const [followLoading, setFollowLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSrc, setModalSrc] = useState("");
  const [replyTextMap, setReplyTextMap] = useState({});
  const [showReplyInputMap, setShowReplyInputMap] = useState({});

  // Optimize useEffect with proper dependency management
  useEffect(() => {
    setIsFollowing(Boolean(isFollowingProp));
  }, [isFollowingProp]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && modalOpen) setModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  // Memoized handlers to prevent unnecessary re-renders
  const toggleLike = async () => {
    try {
      const res = await API.put(`/posts/like/${post._id}`);
      const updated = res.data;
      setLikes(updated.likes?.length || 0);
      setLiked(updated.likes?.some(id => id.toString() === user?.id));
      if (onUpdated) onUpdated(updated);
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const handleFollowToggle = async () => {
    if (!user) return alert('Please login to follow users');
    const targetId = post.user?._id || post.user?.id;
    if (!targetId) return console.error('No target user id to follow');

    setFollowLoading(true);
    try {
      if (!isFollowing) {
        await API.post(`/users/${targetId}/follow`);
        setIsFollowing(true);
      } else {
        await API.post(`/users/${targetId}/unfollow`);
        setIsFollowing(false);
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Unable to update follow status';
      alert(msg);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;
    try {
      await API.delete(`/posts/${post._id}`);
      if (onDeleted) onDeleted(post._id);
    } catch (err) {
      console.error("Delete post error:", err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await API.post(`/posts/comment/${post._id}`, { text: commentText });
      setCommentText("");
      if (onUpdated) onUpdated(res.data);
    } catch (err) {
      console.error("Add comment error:", err);
    }
  };

  const handleAddReply = async (commentId) => {
    const text = (replyTextMap[commentId] || "").trim();
    if (!text) return;
    try {
      const res = await API.post(`/posts/comment/${post._id}/${commentId}/reply`, { text });
      setReplyTextMap(prev => ({ ...prev, [commentId]: "" }));
      setShowReplyInputMap(prev => ({ ...prev, [commentId]: false }));
      if (onUpdated) onUpdated(res.data);
    } catch (err) {
      console.error("Reply error:", err.response?.data || err.message || err);
    }
  };

  const handleAddReplyToReply = async (commentId, parentReplyId) => {
    const text = (replyTextMap[parentReplyId] || "").trim();
    if (!text) return;
    try {
      const res = await API.post(`/posts/comment/${post._id}/${commentId}/reply/${parentReplyId}`, { text });
      setReplyTextMap(prev => ({ ...prev, [parentReplyId]: "" }));
      setShowReplyInputMap(prev => ({ ...prev, [parentReplyId]: false }));
      if (onUpdated) onUpdated(res.data);
    } catch (err) {
      console.error("Nested reply error:", err.response?.data || err.message || err);
    }
  };

  const handleDeleteReply = async (commentId, replyId) => {
    if (!confirm("Delete this reply?")) return;
    try {
      const res = await API.delete(`/posts/comment/${post._id}/${commentId}/reply/${replyId}`);
      if (onUpdated) onUpdated(res.data);
    } catch (err) {
      console.error("Delete reply error:", err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Delete this comment?")) return;
    try {
      const res = await API.delete(`/posts/comment/${post._id}/${commentId}`);
      if (onUpdated) onUpdated(res.data);
    } catch (err) {
      console.error("Delete comment error:", err);
    }
  };

  const handleAvatarClick = () => navigate(`/profile/${post.user?._id || post.user?.id}`);
  const handleUsernameClick = () => navigate(`/profile/${post.user?._id || post.user?.id}`);
  const handleImageClick = () => { setModalSrc(post.image); setModalOpen(true); };
  const handleCloseModal = () => setModalOpen(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative backdrop-blur-xl bg-white/10 dark:bg-gray-800/20 rounded-2xl p-5 border border-white/20 dark:border-gray-700/30 mb-6 overflow-hidden group hover:border-white/40 dark:hover:border-gray-600/50 hover:shadow-xl transition-all duration-300"
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 dark:from-blue-500/10 dark:via-indigo-500/10 dark:to-purple-500/10 -z-10" />

      {/* Top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-400 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-300" />
          <Avatar user={post.user} size={48} onClick={handleAvatarClick} enableOptions={!(user && post.user && user.id === (post.user._id || post.user.id))} className="relative ring-2 ring-white/20 dark:ring-gray-700/30" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleUsernameClick}
              className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
            >
              {post.user?.username}
            </button>
            {user && post.user && (user.id !== (post.user._id || post.user.id)) && (
              <button
                onClick={handleFollowToggle}
                disabled={followLoading}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-all duration-300 ${isFollowing
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md hover:shadow-lg'
                  } ${followLoading ? 'opacity-60 cursor-wait' : 'active:scale-95'}`}
                aria-label={isFollowing ? 'Following' : 'Follow'}
                title={isFollowing ? 'Following' : 'Follow'}
              >
                {followLoading ? '...' : (isFollowing ? '✓ Following' : '+ Follow')}
              </button>
            )}
          </div>
          <small className="text-gray-500 dark:text-gray-400 text-xs">{new Date(post.createdAt).toLocaleString()}</small>
        </div>

        {user && post.user && user.id === post.user._id && (
          <button
            onClick={handleDelete}
            className="ml-auto p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-300 active:scale-95"
            aria-label="Delete post"
            title="Delete post"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m5 4v6m4-6v6M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">{post.content}</p>
        {post.image && (
          <div className="mt-4 relative rounded-xl overflow-hidden group/image">
            <img
              src={post.image}
              alt="post"
              className="w-full max-h-[500px] object-cover cursor-pointer transition-transform duration-300 group-hover/image:scale-105"
              onClick={handleImageClick}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </div>
        )}

        {/* Image lightbox/modal */}
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={handleCloseModal}
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={handleCloseModal}
              className="absolute top-6 right-6 text-white bg-black/40 hover:bg-black/60 rounded-full p-3 transition-all duration-300 hover:scale-110 active:scale-95"
              aria-label="Close image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={modalSrc}
              alt="enlarged"
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-6 py-3 border-t border-white/10 dark:border-gray-700/30">
        <button
          onClick={toggleLike}
          className={`group/like flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${liked
            ? "text-red-500 bg-red-50 dark:bg-red-900/20"
            : "text-gray-600 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            } active:scale-95`}
        >
          <svg className={`w-5 h-5 transition-transform duration-300 ${liked ? 'scale-110' : 'group-hover/like:scale-110'}`} fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="font-semibold text-sm">{likes}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="group/comment flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 active:scale-95"
        >
          <svg className="w-5 h-5 transition-transform duration-300 group-hover/comment:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.121-3.823A7.954 7.954 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="font-semibold text-sm">{post.comments?.length || 0}</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4 pt-4 border-t border-white/10 dark:border-gray-700/30 space-y-4"
        >
          {post.comments?.map(comment => (
            <div key={comment._id} className="backdrop-blur-sm bg-white/50 dark:bg-gray-700/30 rounded-xl p-3 border border-white/20 dark:border-gray-600/20 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all duration-300">
              <div className="flex items-start gap-3">
                <Avatar user={comment.user} size={36} onClick={() => navigate(`/profile/${comment.user?._id || comment.user?.id}`)} className="ring-2 ring-white/20" />
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/profile/${comment.user?._id || comment.user?.id}`)}
                    className="font-semibold text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                  >
                    {comment.user?.username}
                  </button>
                  <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">{comment.text}</p>

                  <div className="flex items-center gap-3 mt-2">
                    <small className="text-gray-500 dark:text-gray-400 text-xs">{new Date(comment.createdAt).toLocaleString()}</small>
                    <button
                      onClick={() => setShowReplyInputMap(prev => ({ ...prev, [comment._id]: !prev[comment._id] }))}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors p-1 rounded"
                      aria-label="Reply to comment"
                      title="Reply"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      Reply
                    </button>
                    {user && comment.user && (user.id === comment.user._id) && (
                      <button
                        onClick={() => handleDeleteComment(comment._id)}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors p-1 rounded"
                        aria-label="Delete comment"
                        title="Delete comment"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m5 4v6m4-6v6M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                        </svg>
                        Delete
                      </button>
                    )}
                  </div>

                  {/* replies */}
                  {comment.replies?.map(reply => (
                    <ReplyNode
                      key={reply._id}
                      reply={reply}
                      commentId={comment._id}
                      replyTextMap={replyTextMap}
                      setReplyTextMap={setReplyTextMap}
                      showReplyInputMap={showReplyInputMap}
                      setShowReplyInputMap={setShowReplyInputMap}
                      handleAddReplyToReply={handleAddReplyToReply}
                      handleDeleteReply={handleDeleteReply}
                      user={user}
                    />
                  ))}

                  {/* Reply Input */}
                  {showReplyInputMap[comment._id] && (
                    <form onSubmit={(e) => { e.preventDefault(); handleAddReply(comment._id); }} className="mt-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyTextMap[comment._id] || ""}
                          onChange={(e) => { setReplyTextMap(prev => ({ ...prev, [comment._id]: e.target.value })); }}
                          onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); } }}
                          placeholder="Write a reply..."
                          className="flex-1 px-3 py-2 rounded-lg bg-white/70 dark:bg-gray-600/70 border border-gray-200 dark:border-gray-500 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none text-sm placeholder-gray-400 transition-all duration-300"
                        />
                        <button type="submit" disabled={!(replyTextMap[comment._id] && replyTextMap[comment._id].trim())} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95">Reply</button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="mt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-4 py-2.5 rounded-lg bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none text-sm placeholder-gray-400 transition-all duration-300"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm active:scale-95"
                disabled={!commentText.trim()}
              >
                Comment
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </motion.div>
  );
});

export default PostCard;
