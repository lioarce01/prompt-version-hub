import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@/types/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      // Persist token to localStorage
      localStorage.setItem("token", action.payload.token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      // Clear token from localStorage
      localStorage.removeItem("token");
    },
    // Restore session from localStorage on app init
    restoreSession: (state, action: PayloadAction<{ token: string }>) => {
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
  },
});

export const { setCredentials, logout, restoreSession } = authSlice.actions;
export default authSlice.reducer;
