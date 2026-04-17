/**
 * Centralized API configuration for deployment.
 * The front-end will use VITE_API_BASE_URL from environment variables if defined.
 * Fallback: Local development hostname (localhost:8000).
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8000`;

console.log('Using API Base URL:', API_BASE_URL);
