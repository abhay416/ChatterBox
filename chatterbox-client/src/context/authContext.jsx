
import React, { createContext, useContext, useState, useEffect } from "react";
import API from "../utils/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const STORAGE_USER = "chatter_user";
  const STORAGE_TOKEN = "chatter_token";

  // Enhanced localStorage operations with quota management
  function safeSetItem(key, value, retry = true) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn("localStorage quota exceeded for", key);

        // If this is a retry after cleanup, give up
        if (!retry) {
          console.error("Failed to set localStorage item even after cleanup:", key);
          return false;
        }

        // Try to free up space by removing old data
        cleanupLocalStorage(key);

        // Retry the operation
        return safeSetItem(key, value, false);
      }
      console.warn("localStorage error for", key, e);
      return false;
    }
  }

  function safeGetItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("localStorage get error for", key, e);
      return null;
    }
  }

  function safeRemoveItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn("localStorage remove error for", key, e);
      return false;
    }
  }

  function cleanupLocalStorage(preserveKey = null) {
    try {
      // Remove old/unused localStorage items
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key !== preserveKey && !key.startsWith('chatter_')) {
          keysToRemove.push(key);
        }
      }

      // Remove identified keys
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // If still need space, remove our own old data (but preserve current user/token)
      if (localStorage.length > 5) { // Leave some headroom
        const ourKeys = ['chatter_user_old', 'chatter_token_old', 'temp_user_data'];
        ourKeys.forEach(key => {
          if (key !== preserveKey) {
            localStorage.removeItem(key);
          }
        });
      }

      console.log("Cleaned up localStorage. Removed", keysToRemove.length, "old items");
    } catch (e) {
      console.warn("localStorage cleanup error:", e);
    }
  }

  // Store only the absolute minimum user data needed
  function getMinimalUser(user) {
    if (!user) return null;

    return {
      id: user.id || user._id || user.userId,
      username: user.username || user.userName,
      email: user.email,
      // Only store bio and avatar if they exist and are reasonable size
      bio: user.bio && user.bio.length < 500 ? user.bio : "",
      avatar: user.avatar && user.avatar.length < 200 ? user.avatar : "",
    };
  }

  const [user, setUser] = useState(() => {
    const saved = safeGetItem(STORAGE_USER);
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      const minimalUser = getMinimalUser(user);
      if (minimalUser) {
        safeSetItem(STORAGE_USER, JSON.stringify(minimalUser));
      }
    } else {
      safeRemoveItem(STORAGE_USER);
      safeRemoveItem(STORAGE_TOKEN);
    }
  }, [user]);

  const login = async (email, password) => {
    try {
      const res = await API.post("/auth/login", { email, password });

      // Store token using safe method
      if (res.data.token) {
        safeSetItem(STORAGE_TOKEN, res.data.token);
      }

      // Store user using safe method
      if (res.data.user) {
        setUser(res.data.user);
      }

      return res.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (username, email, password) => {
    try {
      const res = await API.post("/auth/register", { username, email, password });

      // Store token using safe method
      if (res.data.token) {
        safeSetItem(STORAGE_TOKEN, res.data.token);
      }

      // Store user using safe method
      if (res.data.user) {
        setUser(res.data.user);
      }

      return res.data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const logout = () => {
    safeRemoveItem(STORAGE_TOKEN);
    safeRemoveItem(STORAGE_USER);
    setUser(null);
  };

  // Helper function to get stored token
  const getStoredToken = () => {
    return safeGetItem(STORAGE_TOKEN);
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      login,
      register,
      logout,
      getStoredToken
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
