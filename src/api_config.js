/**
 * Centralized API configuration for deployment.
 * Set VITE_API_BASE_URL in Vercel Environment Variables to your backend URL.
 * Fallback: localhost:8000 for local development only.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
