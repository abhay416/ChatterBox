import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import API from "../utils/api";
import Avatar from './Avatar';
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [searchQ, setSearchQ] = useState("");
  const [results, setResults] = useState([]);
  const searchRef = useRef();


  const handleLogout = () => {
    logout();
    nav("/login");
  };

  useEffect(() => {
    if (!user) return;
    // load followers/following for current user
    const load = async () => {
      try {
        const [fRes, foRes] = await Promise.all([
          API.get(`/users/${user.id}/followers`),
          API.get(`/users/${user.id}/following`)
        ]);
        setFollowers(fRes.data);
        setFollowing(foRes.data);
      } catch (err) {
        console.error("Failed loading follow lists", err);
      }
    };
    load();
  }, [user]);

  // debounced search
  useEffect(() => {
    if (!searchQ) return setResults([]);
    const t = setTimeout(async () => {
      try {
        const res = await API.get(`/users/search?q=${encodeURIComponent(searchQ)}`);
        setResults(res.data);
      } catch (err) {
        console.error("Search error", err.response?.data || err.message || err);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchQ]);

  // navigate to profile when clicking a result
  const goToProfile = (id) => {
    setSearchQ("");
    setResults([]);
    nav(`/profile/${id}`);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/70 shadow-lg">
        <div className="mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4 sm:gap-6">
          {/* Left: Menu + Brand */}
          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <button aria-label="Toggle menu" onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link to="/" className="font-extrabold text-lg sm:text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 tracking-tight whitespace-nowrap">
              ChatterBox
            </Link>
          </div>

          {/* Center: Search (desktop only) */}
          {user && (
            <div className="hidden lg:block flex-1 max-w-md relative">
              <input
                ref={searchRef}
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search users..."
                className="w-full px-3 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
              />
              {(results.length > 0 || searchQ) && (
                <div className="absolute left-0 right-0 mt-2 bg-white/95 dark:bg-gray-900/95 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-40 max-h-60 overflow-auto">
                  {results.length > 0 ? results.map(r => (
                    <div key={r._id} onClick={() => goToProfile(r._id)} className="flex items-center gap-3 p-2 sm:p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <Avatar user={r} size={32} enableOptions={false}/>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{r.username}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{r._id}</div>
                      </div>
                    </div>
                  )) : (
                    <div className="p-3 text-sm text-gray-500">{searchQ ? 'No results' : ''}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Mobile search icon */}
            {user && (
              <button aria-label="Toggle mobile search" onClick={() => setMobileSearchOpen(!mobileSearchOpen)} className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            {user ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(v => !v)} className="flex items-center justify-center hover:opacity-80 transition-opacity">
                  <Avatar user={user} size={40} enableOptions={false} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-3 w-48 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2">
                      <Link to={`/profile/${user.id}`} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-950/30 dark:hover:to-indigo-950/30 transition-all duration-200 group">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium text-sm">Profile</span>
                      </Link>
                      <Link to="/" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-950/30 dark:hover:to-pink-950/30 transition-all duration-200 group">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium text-sm">Feed</span>
                      </Link>
                      <div className="my-1 border-t border-gray-200 dark:border-gray-700/50"></div>
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 dark:hover:from-red-950/30 dark:hover:to-rose-950/30 transition-all duration-200 group">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="font-medium text-sm">Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="text-xs sm:text-sm px-4 sm:px-5 py-2 rounded-xl border-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all duration-200 font-medium hover:-translate-y-0.5 whitespace-nowrap">
                  Login
                </Link>
                <Link to="/signup" className="text-xs sm:text-sm px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 text-white shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-200 font-medium whitespace-nowrap">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile search bar */}
        {user && mobileSearchOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3">
            <input
              ref={searchRef}
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search users..."
              className="w-full px-3 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
              autoFocus
            />
            {(results.length > 0 || searchQ) && (
              <div className="mt-2 bg-white/95 dark:bg-gray-900/95 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl max-h-64 overflow-auto">
                {results.length > 0 ? results.map(r => (
                  <div key={r._id} onClick={() => { goToProfile(r._id); setMobileSearchOpen(false); }} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <Avatar user={r} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{r.username}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{r._id}</div>
                    </div>
                  </div>
                )) : (
                  <div className="p-3 text-sm text-gray-500">{searchQ ? 'No results' : ''}</div>
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* left menu panel */}
      {menuOpen && (
        <motion.div
          className="fixed top-[70px] left-4 z-50 w-[92%] sm:w-96 backdrop-blur-xl bg-white/10 dark:bg-gray-800/20 border border-white/20 dark:border-gray-700/30 sm:rounded-3xl shadow-2xl p-6 overflow-hidden"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10 -z-10" />

          {/* Followers Section */}
          <div className="mb-6">
            <motion.h3 className="font-bold text-lg bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-3">Followers</motion.h3>
            <motion.div className="max-h-48 overflow-auto space-y-2 scrollbar-hide">
              {followers.length ? followers.map((f, idx) => (
                <motion.div
                  key={f._id}
                  className="flex items-center gap-3 p-3 hover:bg-white/10 dark:hover:bg-gray-800/30 rounded-2xl cursor-pointer transition-all duration-200 border border-transparent hover:border-blue-400/30 group"
                  onClick={() => { nav(`/profile/${f._id}`); setMenuOpen(false); }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ x: 6 }}
                >
                  <Avatar user={f} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-400 transition-colors">{f.username}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{f.bio || 'View profile'}</div>
                  </div>
                  <motion.div className="text-lg opacity-0 group-hover:opacity-100 transition-opacity">→</motion.div>
                </motion.div>
              )) : (
                <motion.div
                  className="text-sm text-gray-500 dark:text-gray-400 text-center py-6 bg-white/5 dark:bg-gray-800/10 rounded-2xl border border-white/10 dark:border-gray-700/20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="text-2xl mb-1">👤</div>
                  No followers yet
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 dark:via-gray-700/20 to-transparent my-4" />

          {/* Following Section */}
          <div>
            <motion.h3 className="font-bold text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">Following</motion.h3>
            <motion.div className="max-h-48 overflow-auto space-y-2 scrollbar-hide">
              {following.length ? following.map((f, idx) => (
                <motion.div
                  key={f._id}
                  className="flex items-center gap-3 p-3 hover:bg-white/10 dark:hover:bg-gray-800/30 rounded-2xl cursor-pointer transition-all duration-200 border border-transparent hover:border-purple-400/30 group"
                  onClick={() => { nav(`/profile/${f._id}`); setMenuOpen(false); }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ x: 6 }}
                >
                  <Avatar user={f} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-purple-400 transition-colors">{f.username}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{f.bio || 'View profile'}</div>
                  </div>
                  <motion.div className="text-lg opacity-0 group-hover:opacity-100 transition-opacity">→</motion.div>
                </motion.div>
              )) : (
                <motion.div
                  className="text-sm text-gray-500 dark:text-gray-400 text-center py-6 bg-white/5 dark:bg-gray-800/10 rounded-2xl border border-white/10 dark:border-gray-700/20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="text-2xl mb-1">👥</div>
                  Not following anyone yet
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </>
  );
}
