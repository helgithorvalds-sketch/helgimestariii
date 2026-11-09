const KEY = "nv_click_logged";

export async function trackClickOnce() {
  if (typeof window === "undefined") return;
  // never log local development or automated browsers (QA screenshots) into the live table
  if (import.meta.env.DEV || navigator.webdriver) return;
  try {
    const params = new URLSearchParams(window.location.search);
    const src = params.get("src");
    const medium = params.get("medium");
    const path = window.location.pathname + window.location.search;

    // Dedupe per-tab per-path so navigation doesn't spam rows.
    const marker = `${KEY}:${path}`;
    if (sessionStorage.getItem(marker)) return;
    sessionStorage.setItem(marker, "1");

    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("clicks").insert({
      src,
      medium,
      path,
      user_agent: navigator.userAgent,
    });
  } catch {
    // silent
  }
}
