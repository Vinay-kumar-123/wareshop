import connectDB, { disconnectDB } from '../config/db.js';
import env, { isStrongPassword } from '../config/env.js';
import authService from '../services/authService.js';
import logger from '../utils/logger.js';

/**
 * Explicit CLI script to provision or rotate owner (SUPER_ADMIN) account.
 * Usage:
 *   node src/scripts/bootstrapAdmin.js
 *   node src/scripts/bootstrapAdmin.js <email> <password>
 */
async function run() {
  const args = process.argv.slice(2);
  const email = (args[0] || env.admin.email || '').trim().toLowerCase();
  const password = args[1] || env.admin.password || '';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    console.error('Error: A valid administrator email is required via CLI argument or ADMIN_EMAIL env var.');
    process.exit(1);
  }

  if (!isStrongPassword(password)) {
    console.error(
      'Error: Password must be at least 12 characters and include uppercase, lowercase, number, and symbol.'
    );
    process.exit(1);
  }

  const conn = await connectDB();
  if (!conn) {
    console.error('Error: Database connection is required to bootstrap administrator account.');
    process.exit(1);
  }

  try {
    const admin = await authService.bootstrapAdmin({
      email,
      password,
      forceRotate: true,
      allowInProduction: true,
    });

    console.log('\n========================================================');
    console.log(` OWNER ACCOUNT CONFIGURED: ${admin.email}`);
    console.log(` Role: ${admin.role}`);
    console.log(` Password Rotated: ${admin.passwordRotatedAt?.toISOString()}`);
    console.log(' Status: Active & Secured (all active sessions revoked)');
    console.log('========================================================\n');
  } catch (err) {
    logger.error('Failed to bootstrap owner account', { error: err.message });
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

run();
