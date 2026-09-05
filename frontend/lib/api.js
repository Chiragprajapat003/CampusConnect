import { API_BASE_URL } from "./config";
import { Storage } from "./storage";

/**
 * Universal API Client with Robust FormData & JSON Support
 * 
 * WHAT IT DOES:
 * - Automatically attaches Bearer JWT authorization tokens.
 * - Correctly detects React Native FormData payloads so Android/iOS fetch
 *   can set the multipart boundary header without network failures.
 * - Normalizes JSON payloads and handles network error diagnostics.
 */

export const api = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    // 1. Retrieve stored JWT token
    const token = await Storage.getToken();

    // 2. Setup headers
    const headers = {
      ...(options.headers || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // 3. Robust React Native FormData detection
    const isFormData =
      options.body &&
      (options.body instanceof FormData ||
        typeof options.body.getParts === "function" ||
        Array.isArray(options.body?._parts));

    if (!isFormData && options.body && typeof options.body === "object") {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }

    // 4. Execute fetch with proper error handling
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.message || `HTTP ${response.status} Error`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      // Use warn instead of error to avoid triggering React Native's red LogBox overlay
      // The error is still properly thrown and handled by the calling screen
      console.warn(`API Warning [${options.method || "GET"} ${endpoint}]:`, error.message);
      throw error;
    }
  },

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "GET" });
  },

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: "POST", body });
  },

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: "PUT", body });
  },

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: "PATCH", body });
  },

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  },
};
