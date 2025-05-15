import User from './models/User.js';
import crypto from 'crypto';

const ADMIN_ACCOUNTS = [
  { username: 'admin1', email: 'admin1@example.com' },
  { username: 'admin2', email: 'admin2@example.com' },
  { username: 'admin3', email: 'admin3@example.com' }
];

const PASSWORD = '11223344';

export async function initializeAdminAccounts() {
  try {
    for (const account of ADMIN_ACCOUNTS) {
      // Check if admin account already exists
      const existingUser = await User.findOne({ where: { username: account.username } });
      if (existingUser) {
        console.log(`Admin account ${account.username} already exists, skipping...`);
        continue;
      }

      // Create new admin account
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = await new Promise((resolve, reject) => {
        crypto.pbkdf2(PASSWORD, salt, 310000, 32, 'sha256', (err, hash) => {
          if (err) reject(err);
          else resolve(hash);
        });
      });

      await User.create({
        username: account.username,
        email: account.email,
        password: hash,
        salt: salt,
        role: 'admin'
      });

      console.log(`Created admin account: ${account.username}`);
    }
    console.log('Admin accounts initialization completed');
  } catch (error) {
    console.error('Error initializing admin accounts:', error);
  }
} 