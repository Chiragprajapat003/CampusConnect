const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Authentication Middleware (protect)
 * 
 * WHAT IT DOES:
 * Intercepts incoming requests to protected routes, checks for a valid JWT Bearer token
 * in the Authorization header, verifies it, and attaches the authenticated user object to `req.user`.
 * 
 * WHY IT'S STRUCTURED THIS WAY:
 * By extracting authentication into reusable middleware, any route can be protected
 * simply by passing `protect` as a middleware argument (e.g. `router.get("/me", protect, getMe)`).
 */
const protect = async (req, res, next) => {
  let token;

  // 1. Check if Authorization header exists and follows the "Bearer <token>" format
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    try {
      // Extract token string after "Bearer "
      token = req.headers.authorization.split(" ")[1];

      // 2. Verify token signature and expiration against our secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Find the user in DB and attach to req.user (excluding the passwordHash for security)
      const user = await User.findById(decoded.userId).select("-passwordHash");

      if (!user) {
        return res.status(401).json({
          message: "User belonging to this token no longer exists.",
        });
      }

      // Attach user to request object for downstream controllers to access (e.g., req.user._id)
      req.user = user;

      // Pass control to the next middleware or controller
      next();
    } catch (error) {
      console.error("JWT Verification Error:", error.message);

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Token has expired. Please log in again.",
        });
      }

      return res.status(401).json({
        message: "Invalid token. Authorization denied.",
      });
    }
  } else {
    // No token provided in header
    return res.status(401).json({
      message: "No authorization token provided. Access denied.",
    });
  }
};

module.exports = {
  protect,
};
