import axios from "axios";


const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://chatter-box-g7pn.vercel.app/api",
  headers: { "Content-Type": "application/json" }
});

// Add auth token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("chatter_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;
