import passport from "passport";
import LocalStrategy from "passport-local";
import User from "../models/User.js";
import crypto from "crypto";


export function registerAuthRoutes(app) {
    app.post('/login', passport.authenticate('local', {
      successRedirect: '/',
      failureRedirect: '/login'
    }));
}
