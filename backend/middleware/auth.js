export function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  // если не авторизован — 401
  res.status(401).json({ error: "Not authenticated" });
}
