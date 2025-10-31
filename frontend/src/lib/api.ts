import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "./store";

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  credentials: "include", // Include cookies for refresh token
  prepareHeaders: (headers, { getState }) => {
    // Get token from Redux store (preferred) or localStorage (fallback)
    const stateToken = (getState() as RootState).auth.token;
    const browserToken =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    let token = stateToken || browserToken;

    // Fix: Remove extra quotes from token if present (redux-persist sometimes double-serializes)
    if (token && typeof token === "string") {
      // Remove surrounding quotes if they exist
      token = token.replace(/^"(.*)"$/, "$1");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const api = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: ["Prompt", "Deployment", "Experiment", "Analytics", "User"],
  endpoints: () => ({}),
});
