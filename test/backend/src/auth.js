import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

export function signUserToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      status: user.status,
      isAdmin: Boolean(user.isAdmin),
      canOrderPieces: user.canOrderPieces,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!token) return res.status(401).json({ error: "Missing token." });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token." });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: "Admin access required." });
  }
  return next();
}
