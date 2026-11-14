import readline from 'readline';
import connectDB, { disconnectDB } from '../config/db.js';
import { isStrongPassword } from '../config/env.js';
import Admin from '../models/Admin.js';
import { logAdminActivity } from '../services/activityLogger.js';
import logger from '../utils/logger.js';

/**
 * Secure CLI-only admin password reset tool.
 *
 * Requirements:
 * - Explicit execution by an authorized operator.
 * - Updates only existing admin accounts (never creates new accounts).
 * - Preserves existing role and other account settings.
 * - Uses the native salted scrypt key derivation algorithm.
 * - Automatically revokes all existing active sessions.
 * - Clears any lockout or failed attempt counters.
 * - Never logs or exposes passwords.
 *
 * Usage:
 *   Interactive:
 *     node src/scripts/resetAdminPassword.js
 *     node src/scripts/resetAdminPassword.js <email>
 *   Non-interactive (env var):
 *     NEW_ADMIN_PASSWORD="<strong-password>" node src/scripts/resetAdminPassword.js <email>
 */

function promptQuestion(query, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (hidden && process.stdin.isTTY) {
      process.stdout.write(query);
      let input = '';
      const onData = (char) => {
        const c = char.toString('utf8');
        switch (c) {
          case '\n':
          case '\r':
          case '\u0004':
            process.stdin.removeListener('data', onData);
            break;
          case '\u0003':
            process.exit(1);
            break;
          case '\b':
          case '\x7f':
            if (input.length > 0) {
              input = input.slice(0, -1);
            }
            break;
          default:
            input += c;
            break;
        }
      };
      process.stdin.on('data', onData);
      rl.question('', () => {
        process.stdout.write('\n');
        rl.close();
        resolve(input.trim());
      });
    } else {
      rl.question(query, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

async function run() {
  const args = process.argv.slice(2);
  let email = (args[0] || '').trim().toLowerCase();

  if (!email) {
    email = await promptQuestion('Enter administrator email to reset: ');
    email = email.trim().toLowerCase();
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    console.error('Error: A valid administrator email is required.');
    process.exit(1);
  }

  const conn = await connectDB();
  if (!conn) {
    console.error('Error: Database connection failed. Cannot reset password.');
    process.exit(1);
  }

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      console.error(
        `Error: No administrator account found with email "${email}". Password reset operates only on existing accounts.`
      );
      process.exit(1);
    }

    let newPassword = (process.env.NEW_ADMIN_PASSWORD || args[1] || '').trim();
    if (!newPassword) {
      newPassword = await promptQuestion('Enter new strong password: ', true);
    }

    if (!isStrongPassword(newPassword)) {
      console.error(
        'Error: Password must be at least 12 characters and include uppercase, lowercase, number, and symbol.'
      );
      process.exit(1);
    }

    // Hash using native salted scrypt key derivation
    const { salt, passwordHash } = Admin.hashPassword(newPassword);

    // Update credentials while strictly preserving role and other account metadata
    admin.passwordHash = passwordHash;
    admin.salt = salt;
    admin.sessionToken = null;
    admin.sessionTokenHash = null;
    admin.sessionExpiresAt = null;
    admin.failedLoginAttempts = 0;
    admin.lockoutUntil = null;
    admin.passwordRotatedAt = new Date();

    await admin.save();

    // Log administrative activity without sensitive secrets
    await logAdminActivity({
      adminEmail: email,
      action: 'PASSWORD_RESET_CLI',
      targetType: 'AUTH',
      targetId: String(admin._id),
      details: {
        role: admin.role,
        rotatedAt: admin.passwordRotatedAt,
      },
    });

    console.log('\n========================================================');
    console.log(` ADMINISTRATOR PASSWORD RESET SUCCESSFUL`);
    console.log(` Account: ${admin.email}`);
    console.log(` Role (Preserved): ${admin.role}`);
    console.log(` Rotated At: ${admin.passwordRotatedAt.toISOString()}`);
    console.log(' All active sessions revoked. Lockout status cleared.');
    console.log('========================================================\n');
  } catch (err) {
    logger.error('Failed to reset administrator password', { error: err.message });
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

run();
