# WARESHOP — Database Migration and Backup Plan

This document details the MongoDB schema architecture, index synchronization strategy, non-destructive data normalization plan, and backup/recovery procedures for WARESHOP.

---

## 1. Active Collections & Schema Summary

WARESHOP uses 7 core MongoDB collections in `wareshop_prod` (or `wareshop_dev` in development):

| Collection | Mongoose Model | Purpose | Key Indexes |
| :--- | :--- | :--- | :--- |
| `categories` | `Category` (`src/models/Category.js`) | Commercial verticals (`Shop`, `Office`, `Warehouse`, `Godown`, plus admin-approved categories). | `{ slug: 1 }` (unique), `{ name: 1 }` (unique), `{ status: 1, displayOrder: 1 }` |
| `customcategoryrequests` | `CustomCategoryRequest` (`src/models/CustomCategoryRequest.js`) | Provider requests when selecting `"Other"` during listing submission. | `{ status: 1, createdAt: -1 }`, `{ applicationId: 1 }`, `{ providerAccountId: 1 }` |
| `provideraccounts` | `ProviderAccount` (`src/models/ProviderAccount.js`) | OTP-authenticated business/property owner accounts (`ACTIVE`, `SUSPENDED`). | `{ phone: 1 }` (unique), `{ sessionTokenHash: 1 }` (sparse), `{ status: 1 }` |
| `otpchallenges` | `OtpChallenge` (`src/models/OtpChallenge.js`) | Server-side HMAC-SHA256 OTP challenges, attempt counters, and one-time verification tokens. | `{ phone: 1, createdAt: -1 }`, `{ recordExpiresAt: 1 }` (TTL index: `expireAfterSeconds: 0`) |
| `leads` | `Lead` (`src/models/Lead.js`) | Provider listing applications (`type: 'partner'`, states: `SUBMITTED`, `APPROVED`, `PUBLISHED`, `UNPUBLISHED`, `REJECTED`, `SUSPENDED`). | `{ referenceId: 1 }` (unique), `{ providerAccountId: 1, createdAt: -1 }`, `{ type: 1, status: 1, createdAt: -1 }` |
| `providers` | `Provider` (`src/models/Provider.js`) | Marketplace business/property listings (`SUBMITTED`, `APPROVED`, `PUBLISHED`, `UNPUBLISHED`, `REJECTED`, `SUSPENDED`). | `{ slug: 1 }` (unique), `{ sourceApplicationId: 1 }` (unique, sparse), `{ providerAccountId: 1 }`, `{ verificationStatus: 1, publicationStatus: 1, categorySlug: 1, city: 1 }` |
| `admins` & `activitylogs` | `Admin` & `ActivityLog` | Administrator accounts (`SUPER_ADMIN`, `REVIEWER`, `SUPPORT`) and immutable audit trail. | `admins`: `{ email: 1 }` (unique), `{ sessionTokenHash: 1 }` (sparse); `activitylogs`: `{ createdAt: -1 }`, `{ adminEmail: 1, createdAt: -1 }` |

> **Out-of-Scope Legacy Collections**: The legacy `Blog` model and customer enquiry pathways have been removed from application code. Any pre-existing `blogs` documents in an older database remain untouched unless explicitly archived after backup.

---

## 2. Non-Destructive Compatibility & Normalization Rules

To ensure zero data loss when upgrading existing records:
1. **Canonical Lifecycle State Mapping (`listingLifecycleService.js`)**:
   - Existing `Lead` applications with legacy `status: 'new'` are normalized at runtime and in queries to `SUBMITTED`.
   - Existing `Lead` applications with legacy `status: 'qualified'` or `'converted'` are normalized to `APPROVED`.
   - Existing `Provider` listings without an explicit `status` field derive their canonical state from `verificationStatus` + `publicationStatus` (`VERIFIED` + `PUBLISHED` -> `PUBLISHED`, `VERIFIED` + `DRAFT` -> `APPROVED`, `VERIFIED` + `ARCHIVED` -> `UNPUBLISHED`).
2. **Email Optionality**:
   - `Lead.email` and `Provider.email` default to `''` and only validate email format when a non-empty value is supplied.
3. **Unique `sourceApplicationId` Guard**:
   - `Provider.sourceApplicationId` uses a sparse unique index (`{ unique: true, sparse: true }`) so legacy records without `sourceApplicationId` do not collide, while every approved application can create at most one `Provider` listing.

---

## 3. Backup & Restore Runbook

### A. Pre-Migration / Pre-Release Snapshot
Before running index synchronization or schema migrations in production:
1. **MongoDB Atlas Snapshot**:
   - Navigate to **Atlas -> Backup -> Take Snapshot Now** and wait for status `Completed`.
2. **Logical `mongodump` Backup**:
   ```bash
   mongodump --uri="$MONGODB_URI" --db="$MONGODB_DB_NAME" --archive="wareshop_backup_$(date +%Y%m%d_%H%M%S).gz" --gzip
   ```

### B. Index Synchronization Procedure
Mongoose models build declared indexes automatically in development. In production, synchronize indexes during a maintenance window after taking a backup:
```bash
node -e "
import('./src/config/db.js').then(async ({ default: connectDB, disconnectDB }) => {
  await connectDB();
  const models = [
    (await import('./src/models/Category.js')).default,
    (await import('./src/models/CustomCategoryRequest.js')).default,
    (await import('./src/models/ProviderAccount.js')).default,
    (await import('./src/models/OtpChallenge.js')).default,
    (await import('./src/models/Lead.js')).default,
    (await import('./src/models/Provider.js')).default,
    (await import('./src/models/Admin.js')).default,
    (await import('./src/models/ActivityLog.js')).default,
  ];
  for (const M of models) {
    await M.createIndexes();
    console.log('Synced indexes for:', M.modelName);
  }
  await disconnectDB();
});
"
```

### C. Emergency Restore Procedure
To restore from a `mongodump` archive into a staging or recovery database:
```bash
mongorestore --uri="$MONGODB_URI" --nsFrom="wareshop_prod.*" --nsTo="wareshop_recovery.*" --archive="wareshop_backup_YYYYMMDD_HHMMSS.gz" --gzip
```
