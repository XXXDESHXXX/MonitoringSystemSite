// middleware/admin.js
export function ensureAdmin(req, res, next) {
  // логируем факт захода в админку
  const userInfo = req.user
    ? `user=${req.user.username} (role=${req.user.role})`
    : `anon`;
  console.log(`🛡 [ADMIN_CHECK] попытка доступа к /admin от ${userInfo}, IP=${req.ip}`);

  if (!req.isAuthenticated()) {
    console.log(`❌ [ADMIN_CHECK] отказ: неавторизованный`);
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  if (req.user.role !== 'admin') {
    console.log(`❌ [ADMIN_CHECK] отказ: недостаточно прав (role=${req.user.role})`);
    return res.status(403).json({ error: 'Доступ запрещён' });
  }

  console.log(`✅ [ADMIN_CHECK] разрешено для ${userInfo}`);
  next();
}
