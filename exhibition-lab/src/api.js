/**
 * Portable backend URL helper for Exhibition Lab.
 * Override with REACT_APP_BACKEND_URL or VITE_BACKEND_URL.
 */
export const getBackendUrl = () => {
  const configured =
    (typeof process !== "undefined" &&
      process.env &&
      (process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL)) ||
    "";

  if (!configured) {
    if (typeof window !== "undefined") {
      return window.location.origin.replace(/\/$/, "");
    }
    return "";
  }

  if (typeof window === "undefined") {
    return configured.replace(/\/$/, "");
  }

  try {
    const url = new URL(configured);
    const pageHost = window.location.hostname;
    const isLocalApi =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const pageIsLan =
      pageHost !== "localhost" && pageHost !== "127.0.0.1";

    if (isLocalApi && pageIsLan) {
      url.hostname = pageHost;
      return url.origin;
    }
  } catch {
    /* keep configured */
  }

  return configured.replace(/\/$/, "");
};
