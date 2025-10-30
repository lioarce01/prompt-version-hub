import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  createTransform,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import { api } from "./api";
import authReducer from "@/features/auth/authSlice";

// Transform to ensure token is stored without extra quotes
const tokenTransform = createTransform(
  // Transform state on save (outbound)
  (inboundState: any) => {
    if (inboundState && typeof inboundState.token === "string") {
      // Remove extra quotes if present
      const cleanToken = inboundState.token.replace(/^"(.*)"$/, "$1");
      return { ...inboundState, token: cleanToken };
    }
    return inboundState;
  },
  // Transform state on rehydration (inbound)
  (outboundState: any) => {
    if (outboundState && typeof outboundState.token === "string") {
      // Remove extra quotes if present
      const cleanToken = outboundState.token.replace(/^"(.*)"$/, "$1");
      return { ...outboundState, token: cleanToken };
    }
    return outboundState;
  },
  { whitelist: ["auth"] }
);

// Persist configuration for auth slice
const persistConfig = {
  key: "auth",
  storage,
  whitelist: ["token", "user", "isAuthenticated"], // Only persist these fields
  transforms: [tokenTransform],
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

// Create store function (per request in Next.js App Router)
export const makeStore = () => {
  const store = configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      auth: persistedAuthReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }).concat(api.middleware),
  });

  // Enable refetchOnFocus/refetchOnReconnect behaviors
  setupListeners(store.dispatch);

  return store;
};

// Infer types from makeStore
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
