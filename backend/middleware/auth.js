import { supabase } from "../src/database/supabaseClient.js";

/**
 * Middleware to authenticate incoming API requests using Supabase JWTs.
 * Accepts either:
 *  - Authorization: Bearer <token>  (recommended for frontend requests)
 *  - Cookie: sb-access-token=<token> (for same-site calls)
 */
export const requireAuth = async (req, res, next) => {
  try {
    // 🔍 1️⃣ Extract token from Authorization header or cookie
    let token =
      req.headers.authorization?.replace("Bearer ", "") ||
      req.cookies?.["sb-access-token"];

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Missing authorization token.",
      });
    }

    // 🔑 2️⃣ Verify the token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      console.warn("❌ Auth failed:", error?.message || "Invalid token");
      return res.status(401).json({
        ok: false,
        error: "Invalid or expired token.",
      });
    }

    // ✅ 3️⃣ Attach the authenticated user to the request
    req.user = data.user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(401).json({
      ok: false,
      error: "Authentication failed.",
    });
  }
};
