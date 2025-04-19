import passport from "passport";
import LocalStrategy from "passport-local";
import User from "./models/User.js";
import crypto from "crypto";

function initializePassport() {
    passport.use(new LocalStrategy(
        function verify(username, password, cb) {
            User.findOne({where: {username: username}})
                .then(user => {
                    if (!user) {
                        return cb(null, false, {message: 'Incorrect username or password.'});
                    }

                    crypto.pbkdf2(password, user.salt, 310000, 32, 'sha256', function (err, hashedPassword) {
                      if (err) {
                        return cb(err);
                      }
                      // теперь сравниваем с user.password!
                      if (!crypto.timingSafeEqual(user.password, hashedPassword)) {
                        return cb(null, false, { message: 'Incorrect username or password.' });
                      }

                      return cb(null, user);
                    });

                })
                .catch(err => {
                    return cb(err);
                });
        }
    ));

    // Сериализация пользователя в сессию
    passport.serializeUser((user, cb) => {
        cb(null, user.id);
    });

    // Десериализация пользователя из сессии
    passport.deserializeUser((id, cb) => {
        User.findByPk(id)
            .then(user => {
                cb(null, user);
            })
            .catch(err => {
                cb(err);
            });
    });
}

export { initializePassport, passport };