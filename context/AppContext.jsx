// AppContext.jsx
"use client";
import { createContext, useContext } from "react";
import { useUser } from "@clerk/nextjs";

export const AppContext = createContext({
  user: null,
  isSignedIn: false,
  isLoaded: false,
});

export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = ({ children }) => {
  const { user, isSignedIn, isLoaded } = useUser();

  const value = { user, isSignedIn, isLoaded };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
