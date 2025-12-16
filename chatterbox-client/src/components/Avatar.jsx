import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from "../context/authContext";
import API from '../utils/api';

export default function Avatar({ user, size = 40, className = '', onClick, enableOptions = true }) {
  const { user: current, setUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageModal, setImageModal] = useState(false);
  const fileRef = useRef();

  const isMe = current && user && (current.id === (user._id || user.id));
  const [avatarSrc, setAvatarSrc] = useState(user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}`);

  useEffect(() => {
    setAvatarSrc(user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}`);
  }, [user?.avatar, user?.username]);

  // listen for global avatar updates so every Avatar instance refreshes
  useEffect(() => {
    const handler = (ev) => {
      try {
        const { userId, avatar } = ev.detail || {};
        const id = user?._id || user?.id;
        if (!id) return;
        if (userId && userId.toString() === id.toString()) {
          setAvatarSrc(avatar || `https://ui-avatars.com/api/?name=${user?.username}`);
        }
      } catch (e) { /* ignore */ }
    };
    window.addEventListener('avatarUpdated', handler);
    return () => window.removeEventListener('avatarUpdated', handler);
  }, [user]);

  const handleImageClick = (e) => {
    if (enableOptions) {
      e.stopPropagation();
    }

    if (isMe && enableOptions) {
      // toggle menu on avatar click when enableOptions and isMe
      setMenuOpen(prev => !prev);
      return;
    }

    // If a navigation/onClick handler is provided, prefer that (click on avatar opens profile)
    if (onClick) {
      try { onClick(user); } catch (e) { /* ignore */ }
      return;
    }

    // Don't open image modal if options are disabled
    if (!enableOptions) {
      return;
    }

    setImageModal(true);
  };

  const handleView = () => {
    setImageModal(true);
    setMenuOpen(false);
  };

  const handleChooseFile = () => {
    fileRef.current?.click();
    setMenuOpen(false);
  };

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      try {
        const res = await API.put('/users/me/avatar', { avatar: dataUrl });
        // update auth user
        setUser(prev => ({ ...prev, avatar: res.data.avatar }));
        // update local avatar src immediately for all instances
        window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { userId: (current?.id || current?._id), avatar: res.data.avatar } }));
        alert('Avatar updated');
      } catch (err) {
        console.error('Update avatar error:', err);
        alert('Unable to update avatar');
      }
    };
    reader.readAsDataURL(f);
  };

  const handleRemove = async () => {
    if (!confirm('Remove your profile picture?')) return;
    try {
      await API.delete('/users/me/avatar');
      setUser(prev => ({ ...prev, avatar: null }));
      // notify other components
      window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { userId: (current?.id || current?._id), avatar: null } }));
      setMenuOpen(false);
      alert('Avatar removed');
    } catch (err) {
      console.error('Remove avatar error:', err);
      alert('Unable to remove avatar');
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <img
        src={avatarSrc}
        alt={user?.username || 'avatar'}
        onClick={handleImageClick}
        className={`rounded-full object-cover cursor-pointer`}
        style={{ width: size, height: size }}
      />

      {/* menu for own user */}
      {menuOpen && isMe && enableOptions && (
        <div className="absolute mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50">
          <button onClick={handleView} className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">View</button>
          <button onClick={handleChooseFile} className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Change</button>
          <button onClick={handleRemove} className="w-full text-left px-3 py-2 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">Remove</button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* small menu button for own user */}
      {/* {isMe && enableOptions && (
        <button onClick={(e) => { e.stopPropagation(); setMenuOpen(prev => !prev); }} aria-label="Avatar options" className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow text-xs">⋯</button>
      )} */}

      {/* image modal */}
      {imageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={() => setImageModal(false)}>
          <img src={avatarSrc} alt="enlarged" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
