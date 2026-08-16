import { useEffect, useMemo } from "react";

import { TOKEN_KEY } from "@/lib/data-room";

export function useOAuthCallbackToken() {
  const isOAuthCallback = window.location.pathname === "/oauth/callback";
  const accessToken = useMemo(
    () =>
      isOAuthCallback
        ? new URLSearchParams(window.location.hash.replace(/^#/, "")).get("accessToken")
        : null,
    [isOAuthCallback],
  );

  useEffect(() => {
    if (!isOAuthCallback) {
      return;
    }

    window.history.replaceState(null, "", "/");
  }, [isOAuthCallback]);

  const getInitialToken = () => {
    if (accessToken) {
      localStorage.setItem(TOKEN_KEY, accessToken);
      return accessToken;
    }

    return localStorage.getItem(TOKEN_KEY);
  };

  return {
    accessToken,
    getInitialToken,
    hasMissingOAuthToken: isOAuthCallback && !accessToken,
  };
}
