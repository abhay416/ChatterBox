import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import { io as ioClient } from 'socket.io-client';
import Avatar from './Avatar';
import { motion, AnimatePresence } from "framer-motion";

export default function ChatLauncher() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [partners, setPartners] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedPartner, setSelectedPartner] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const socketRef = useRef(null);

  // load recent conversations optionally (not required)

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const fetchPartners = async () => {
      if (!user) return setError('Please login to see conversations');
      setLoading(true);
      setError(null);
      try {
        const res = await API.get(`/users/${user.id}/following`);
        if (!mounted) return;
        setPartners(res.data || []);
      } catch (err) {
        console.error('Fetch chat partners error:', err);
        setError(err?.response?.data?.message || err.message || 'Unable to load');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchPartners();
    return () => { mounted = false; };
  }, [open, user]);

  // initialize socket connection once
  useEffect(() => {
    const base = (API.defaults.baseURL || window.location.origin).split('/api')[0];
    const socket = ioClient(base);
    socketRef.current = socket;
    socket.on('connect', () => { /*console.log('socket connected', socket.id)*/ });
    socket.on('conversation_updated', (data) => {
      // if current conversation matches, update messages
      if (conversation && data && data._id && conversation._id && data._id.toString() === conversation._id.toString()) {
        setConversation(data);
        setMessages(data.messages || []);
      }
    });
    return () => {
      try { socket.disconnect(); } catch (e) { }
      socketRef.current = null;
    };
  }, []);

  // debounced search
  useEffect(() => {
    if (!open) return;
    const q = searchTerm?.trim();
    let cancelled = false;
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const res = await API.get(`/users/search?q=${encodeURIComponent(q)}`);
        if (cancelled) return;
        setSearchResults(res.data || []);
      } catch (err) {
        console.error('Search users error:', err);
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(id); };
  }, [searchTerm, open]);

  const handleOpen = () => setOpen(prev => !prev);

  const openChat = (u) => {
    setSelectedPartner(u);
    setSearchTerm("");
    // load or create conversation via server
    (async () => {
      try {
        const res = await API.get(`/chats/with/${u._id || u.id}`);
        setConversation(res.data);
        setMessages(res.data.messages || []);
        // join socket room for this conversation
        try { socketRef.current?.emit('join', res.data._id); } catch (e) { }
      } catch (err) {
        console.error('Open chat error (server) — falling back to local:', err);
        // fallback: try local storage
        const stored = JSON.parse(localStorage.getItem('chatter_chats') || '{}');
        setMessages(stored[u._id || u.id] || []);
      }
    })();
  };

  const closeChat = () => {
    // leave socket room
    try { socketRef.current?.emit('leave', conversation?._id); } catch (e) { }
    setSelectedPartner(null);
    setConversation(null);
    setMessages([]);
    setMessageText("");
  };

  const scrollToBottom = () => {
    try { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); } catch (e) { }
  };

  useEffect(() => { scrollToBottom(); }, [selectedPartner, messages]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!selectedPartner) return;
    if (!messageText.trim()) return;
    const text = messageText.trim();
    // if we have a server conversation, post to it
    if (conversation && conversation._id) {
      try {
        const res = await API.post(`/chats/${conversation._id}/message`, { text });
        setConversation(res.data);
        setMessages(res.data.messages || []);
        setMessageText("");
        return;
      } catch (err) {
        console.error('Send message error (server):', err);
      }
    }

    // fallback: localStorage (offline)
    const key = selectedPartner._id || selectedPartner.id;
    const stored = JSON.parse(localStorage.getItem('chatter_chats') || '{}');
    const msg = { from: user?.id, text, createdAt: new Date().toISOString() };
    const updated = { ...stored, [key]: [...(stored[key] || []), msg] };
    localStorage.setItem('chatter_chats', JSON.stringify(updated));
    setMessages(updated[key]);
    setMessageText("");
  };

  return (
    <>
      {/* Floating button (hidden while panel is open) */}
      {!open && (
        <motion.button
          onClick={handleOpen}
          aria-label="Open messages"
          title="Messages"
          className="fixed z-50 bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 hover:shadow-2xl text-white shadow-xl flex items-center justify-center backdrop-blur-lg"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 sm:h-6 sm:w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m5 8l-3-3H6a2 2 0 01-2-2V6a2 2 0 012-2h12a2 2 0 012 2v12z" />
          </motion.svg>
        </motion.button>
      )}

      {open && (
        <motion.div
          className="fixed z-50 inset-x-0 bottom-0 sm:inset-auto sm:bottom-20 sm:right-6 w-full sm:w-96 h-[100vh] sm:h-auto sm:max-h-[90vh] backdrop-blur-xl bg-white/10 dark:bg-gray-800/20 sm:rounded-3xl shadow-2xl p-4 sm:p-5 flex flex-col border-t sm:border border-white/20 dark:border-gray-700/30"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="font-bold text-base sm:text-lg bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Messages</div>
            <motion.button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl sm:text-lg font-semibold transition-colors duration-200"
              whileHover={{ rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              ✕
            </motion.button>
          </div>

          {!selectedPartner && (
            <motion.div className="mb-3 sm:mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search conversations..."
                className="w-full p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-white/20 dark:border-gray-700/20 bg-white/5 dark:bg-gray-800/10 backdrop-blur-md text-sm outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
              />
              {searching && <motion.div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>⟳</motion.div>
                Searching...
              </motion.div>}
            </motion.div>
          )}

          {selectedPartner ? (
            <motion.div className="flex flex-col flex-1 min-h-0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-white/20 dark:border-gray-700/20">
                <motion.button
                  onClick={closeChat}
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors text-xl sm:text-lg"
                  whileHover={{ x: -3 }}
                >
                  ←
                </motion.button>
                <Avatar user={selectedPartner} size={36} className="sm:w-10 sm:h-10" />
                <div className="flex-1 min-w-0">
                  <motion.button
                    onClick={() => { navigate(`/profile/${selectedPartner._id || selectedPartner.id}`); setOpen(false); setSelectedPartner(null); }}
                    className="text-left w-full hover:opacity-80 transition-opacity"
                    whileHover={{ x: 4 }}
                  >
                    <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">{selectedPartner.username}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">View profile</div>
                  </motion.button>
                </div>
              </div>

              <motion.div
                className="flex-1 overflow-auto p-3 sm:p-4 bg-white/5 dark:bg-gray-800/10 rounded-xl sm:rounded-2xl mb-2 sm:mb-3 backdrop-blur-sm space-y-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {messages.map((m, idx) => {
                  const fromId = (m.from && typeof m.from === 'object') ? (m.from._id || m.from.id) : m.from;
                  const isMe = fromId === user?.id;
                  return (
                    <motion.div
                      key={idx}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className={`max-w-[85%] sm:max-w-[75%] p-2.5 sm:p-3 rounded-xl sm:rounded-2xl backdrop-blur-md ${isMe ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-none shadow-lg' : 'bg-white/20 dark:bg-gray-800/30 text-gray-900 dark:text-white rounded-bl-none border border-white/20 dark:border-gray-700/20'}`}>
                        <div className="text-sm">{m.text}</div>
                        <div className="text-xs opacity-70 mt-1">{new Date(m.createdAt).toLocaleTimeString()}</div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </motion.div>

              <motion.form
                onSubmit={sendMessage}
                className="flex gap-2 sm:gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-white/20 dark:border-gray-700/20 bg-white/10 dark:bg-gray-800/20 backdrop-blur-md text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
                />
                <motion.button
                  type="submit"
                  className="px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:shadow-lg text-white rounded-xl sm:rounded-2xl font-medium text-sm transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Send
                </motion.button>
              </motion.form>
            </motion.div>
          ) : (
            <>
              {loading && <motion.div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>⟳</motion.div>
                Loading conversations...
              </motion.div>}
              {error && <motion.div className="text-sm text-red-400 dark:text-red-300 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</motion.div>}

              {!loading && !error && ((searchTerm && searchResults.length === 0 && !searching) ? (
                <motion.div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No results for "{searchTerm}"</motion.div>
              ) : null)}

              <motion.div className="flex-1 overflow-auto min-h-0">
                <AnimatePresence>
                  {(searchTerm ? searchResults : partners).map((p, idx) => (
                    <motion.li
                      key={p._id || p.id}
                      className="flex items-center gap-2 sm:gap-3 py-2.5 sm:py-3 px-2 hover:bg-white/10 dark:hover:bg-gray-800/20 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-200 border border-transparent hover:border-white/20 dark:hover:border-gray-700/20"
                      onClick={() => openChat(p)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ x: 6 }}
                    >
                      <Avatar user={p} size={36} className="sm:w-10 sm:h-10" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">{p.username}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.bio ? (p.bio.length > 40 ? p.bio.slice(0, 40) + '…' : p.bio) : 'Start a conversation'}</div>
                      </div>
                      <motion.div className="text-base sm:text-lg opacity-0 group-hover:opacity-100 transition-opacity">→</motion.div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.div>
            </>
          )}
        </motion.div>
      )}
    </>
  );
}
