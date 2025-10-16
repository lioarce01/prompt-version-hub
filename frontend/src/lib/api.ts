import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "./store";

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  prepareHeaders: (headers, { getState }) => {
    // Get token from Redux store (preferred) or localStorage (fallback)
    const token =
      (getState() as RootState).auth.token || localStorage.getItem("token");

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
