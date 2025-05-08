// src/dependencies.js
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import User from "./models/User.js";
import crypto from "crypto";

function initializePassport() {
  passport.use(new LocalStrategy(
    {
      usernameField: 'username',
      passwordField: 'password'
    },
    async function verify(username, password, done) {
      try {
        const user = await User.findOne({ where: { username } });
        if (!user) {
          return done(null, false, { message: 'Неверный логин или пароль.' });
        }

        // user.password хранится как Buffer (BLOB)
        const userHash = Buffer.isBuffer(user.password)
          ? user.password
          : Buffer.from(user.password, 'binary');

        crypto.pbkdf2(password, user.salt, 310000, 32, 'sha256', (err, hashedPassword) => {
          if (err) return done(err);
          // Сравниваем хэши безопасно
          if (!crypto.timingSafeEqual(userHash, hashedPassword)) {
            return done(null, false, { message: 'Неверный логин или пароль.' });
          }
          return done(null, user);
        });
      } catch (err) {
        return done(err);
      }
    }
  ));

  // Сериализация — сохраняем в сессии только ID
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Десериализация — достаём из БД нужные поля, в том числе role
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findByPk(id, {
        attributes: ['id', 'username', 'email', 'role']
      });
      if (!user) {
        return done(new Error('Пользователь не найден в сессии'));
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}

export { initializePassport, passport };
