import 'dotenv/config';
import mongoose from 'mongoose';
import env from '../config/env.js';
import ProviderAccount, { inspectProviderAccountIndexes } from '../models/ProviderAccount.js';

const applyMode = process.argv.includes('--apply');
const allowProduction = process.argv.includes('--allow-production');

async function auditDuplicates() {
  const col = ProviderAccount.collection;
  const [dupPhones, dupEmails, dupGoogleIds, legacyStats] = await Promise.all([
    col
      .aggregate([
        { $match: { phone: { $type: 'string', $gt: '' } } },
        { $group: { _id: '$phone', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: 'groups' },
      ])
      .toArray(),
    col
      .aggregate([
        { $match: { emailVerified: true, email: { $type: 'string', $gt: '' } } },
        { $group: { _id: '$email', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: 'groups' },
      ])
      .toArray(),
    col
      .aggregate([
        { $match: { googleId: { $type: 'string', $gt: '' } } },
        { $group: { _id: '$googleId', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: 'groups' },
      ])
      .toArray(),
    Promise.all([
      col.countDocuments(),
      col.countDocuments({ $or: [{ phone: null }, { phone: '' }, { phone: { $exists: false } }] }),
      col.countDocuments({ email: { $type: 'string', $gt: '' }, emailVerified: { $ne: true } }),
      col.countDocuments({ $or: [{ googleId: null }, { googleId: '' }, { googleId: { $exists: false } }] }),
    ]),
  ]);

  return {
    duplicatePhoneGroups: dupPhones[0]?.groups || 0,
    duplicateVerifiedEmailGroups: dupEmails[0]?.groups || 0,
    duplicateGoogleIdGroups: dupGoogleIds[0]?.groups || 0,
    totalAccounts: legacyStats[0],
    accountsWithoutPhone: legacyStats[1],
    accountsWithUnverifiedEmail: legacyStats[2],
    accountsWithoutGoogleId: legacyStats[3],
  };
}

async function main() {
  if (!env.mongodbUri) {
    console.error('MONGODB_URI is required.');
    process.exit(1);
  }

  await mongoose.connect(env.mongodbUri, {
    dbName: env.mongodbDbName || undefined,
    serverSelectionTimeoutMS: 5000,
  });

  try {
    console.log(`Connected to database: ${mongoose.connection.name}`);
    const report = await inspectProviderAccountIndexes();
    const audit = await auditDuplicates();

    console.log('Account Audit Summary:', JSON.stringify(audit, null, 2));
    console.log('Index Inspection:', JSON.stringify({ ok: report.ok, issues: report.issues }, null, 2));

    if (report.ok) {
      console.log('All ProviderAccount indexes match the schema. No changes needed.');
      return;
    }

    if (
      audit.duplicatePhoneGroups > 0 ||
      audit.duplicateVerifiedEmailGroups > 0 ||
      audit.duplicateGoogleIdGroups > 0
    ) {
      console.error(
        'Refusing to reconcile indexes while duplicate non-empty keys exist. Remediate duplicates first.'
      );
      process.exitCode = 2;
      return;
    }

    if (!applyMode) {
      console.log('Dry-run complete. Re-run with "--apply" to drop mismatched indexes and sync schema indexes.');
      return;
    }

    if (env.isProduction && !allowProduction) {
      console.error(
        'Refusing to run --apply in production without explicit "--allow-production" confirmation and a verified backup.'
      );
      process.exitCode = 3;
      return;
    }

    for (const issue of report.issues) {
      if (issue.current?.name) {
        console.log(`Dropping mismatched index: ${issue.current.name}`);
        await ProviderAccount.collection.dropIndex(issue.current.name);
      }
    }

    console.log('Syncing ProviderAccount schema indexes...');
    await ProviderAccount.syncIndexes();

    const after = await inspectProviderAccountIndexes();
    console.log(
      'Post-reconciliation Index Inspection:',
      JSON.stringify({ ok: after.ok, issues: after.issues, indexes: after.indexes }, null, 2)
    );
    const postCount = await ProviderAccount.countDocuments();
    console.log('Post-reconciliation provideraccounts count:', postCount);
    if (!after.ok) {
      process.exitCode = 1;
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('Index reconciliation failed:', err.message);
  process.exit(1);
});
