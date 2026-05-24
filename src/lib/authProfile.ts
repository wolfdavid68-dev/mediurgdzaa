import { createContext, useContext } from "react";
import type { Profile } from "./auth";

const AuthProfileContext = createContext<Profile | null>(null);
export const AuthProfileProvider = AuthProfileContext.Provider;

export const useAuthProfile = (): Profile | null => useContext(AuthProfileContext);
