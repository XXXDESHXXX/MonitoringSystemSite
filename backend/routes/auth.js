import passport from "passport";
import express from "express";
import crypto from "crypto";
import User from "../models/User.js";

const router = express.Router();

router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    req.logIn(user, (err) => {
      if (err) { return next(err); }
      return res.json({ message: 'Login successful' });
    });
  })(req, res, next);
});

router.post("/register", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const existing = await User.findOne({ where: { username } });
    if (existing) {
      return res.status(400).json({ error: "Username already taken" });
    }
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.pbkdf2(password, salt, 310000, 32, "sha256", async (err, derivedKey) => {
      if (err) return next(err);
      await User.create({
        username,
        salt,
        password: derivedKey
      });
      res.status(201).json({ message: "User registered" });
    });
  } catch (err) {
    next(err);
  }
});

router.get('/auth/check', (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json({ authenticated: true });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

// Add the logout route
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.status(200).json({ message: 'Logout successful' });
  });
});

export default router;
