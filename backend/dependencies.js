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
                        if (!crypto.timingSafeEqual(user.hashed_password, hashedPassword)) {
                            return cb(null, false, {message: 'Incorrect username or password.'});
                        }

                        return cb(null, user);
                    });
                })
                .catch(err => {
                    return cb(err);
                });
        }
    ));
}

export { initializePassport, passport };
