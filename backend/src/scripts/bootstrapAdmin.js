import connectDB, { disconnectDB } from '../config/db.js';
import Admin from '../models/Admin.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * CLI script to provision or rotate owner (SUPER_ADMIN) account.
 * Usage:
 *   node src/scripts/bootstrapAdmin.js
 *   node src/scripts/bootstrapAdmin.js <email> <password>
 */
async function run() {
  const args = process.argv.slice(2);
  const email = (args[0] || env.admin.email || 'admin@konnevia.in').trim().toLowerCase();
  const password = args[1] || env.admin.password || 'Konnevia@Admin2026!';

  if (!email || !password || password.length < 8) {
    console.error('Usage: node src/scripts/bootstrapAdmin.js <email> <password (min 8 chars)>');
    process.exit(1);
  }

  await connectDB();

  try {
    const { salt, passwordHash } = Admin.hashPassword(password);
    let admin = await Admin.findOne({ email });

    if (admin) {
      admin.passwordHash = passwordHash;
      admin.salt = salt;
      admin.role = 'SUPER_ADMIN';
      admin.sessionToken = null;
      admin.sessionExpiresAt = null;
      admin.passwordRotatedAt = new Date();
      await admin.save();
      logger.info(`Existing owner account rotated: ${email}`);
    } else {
      admin = new Admin({
        email,
        passwordHash,
        salt,
        role: 'SUPER_ADMIN',
        passwordRotatedAt: new Date(),
      });
      await admin.save();
      logger.info(`New owner account provisioned: ${email}`);
    }

    console.log(`\n========================================================`);
    console.log(` OWNER ACCOUNT CONFIGURED: ${email}`);
    console.log(` Role: SUPER_ADMIN`);
    console.log(` Password Rotated: ${admin.passwordRotatedAt}`);
    console.log(` Status: Active & Secured`);
    console.log(`========================================================\n`);
  } catch (err) {
    logger.error('Failed to bootstrap owner account', { error: err.message });
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

run();
