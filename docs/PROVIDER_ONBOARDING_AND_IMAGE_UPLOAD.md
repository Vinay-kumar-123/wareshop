# KONNEVIA Provider Onboarding & Shop Image Upload Architecture
**Document Version**: 2.0 (Production Release)  
**Modules**: Partner Onboarding Flow, Media Upload Pipeline, Storage Abstraction  

---

## 1. Provider Onboarding Flow

The service partner onboarding workflow allows Indian service providers, trade professionals, and agencies to apply to join the marketplace.

### 1.1 Complete Field Specification
- **Enterprise Identity**:
  - `businessName`: Trade or commercial enterprise name (Required).
  - `category`: Primary vertical slug (Required).
  - `servicesOffered`: Comma-separated list or array of specific services provided (Required).
- **Physical Establishment & Image**:
  - `shopImage`: Physical shop, workshop, studio, or office establishment photo (Required in onboarding UI).
  - `address`: Street / commercial complex address.
  - `city`: Operating city headquarters (Required).
  - `state`: State or Union Territory.
  - `pinCode`: 6-digit Indian Postal Identification Number.
  - `serviceAreas`: Localities or suburbs covered.
- **Authorized Representative**:
  - `contactPerson`: Key representative / owner full name (Required).
  - `phone`: 10-digit Indian mobile number (`[6-9]\d{9}`) (Required).
  - `email`: Official correspondence email (Required).
  - `website`: Portfolio or company website (Optional).
- **Company Profile**:
  - `businessDescription`: Minimum 15-character track record and background (Required).
- **Consents & Declarations**:
  - `consentToContact`: Mandatory onboarding audit authorization (Required).
  - `consentToDisplayPhone`: Explicit choice to display direct phone number on public provider card upon publication.

---

## 2. Shop Image Upload Architecture

### 2.1 Client-Side Experience (`BecomePartnerPage.jsx`)
- **Drag-and-Drop / File Picker**: Supports JPEG, PNG, and WebP formats.
- **Immediate Client Preview**: Uses `FileReader` API for instant visual feedback without waiting for server network hops.
- **In-Flight Validation**: Client-side rejection of non-image MIME types and files exceeding 5MB.
- **Remove / Replace Controls**: Allows applicants to swap or discard photos before submitting the application.
- **Multipart Transmission**: Transmitted via standard browser `FormData` with automatic boundary calculation.

### 2.2 Server-Side Processing Pipeline
1. **Multipart Extraction**: `backend/src/middleware/upload.js` uses `multer.memoryStorage()`.
2. **File Validation**:
   - MIME Type Check: Strictly permits `image/jpeg`, `image/png`, and `image/webp`.
   - File Extension Check: Validates against `.jpg`, `.jpeg`, `.png`, `.webp`.
   - Size Cap: Strictly limits payload to configured `env.storage.maxFileSizeMb` (default 5MB).
   - Executable Blocking: Rejects `.exe`, `.sh`, `.php`, `.js`, or polyglot payloads with HTTP 400.
3. **Storage Abstraction Service** (`backend/src/services/storageService.js`):
   - **Local Storage Provider** (Default):
     - Generates safe, random filenames: `shop-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`.
     - Saves buffer to `backend/uploads/` directory.
     - Serves static assets via `/uploads/:key` with proper cache and CORS headers.
   - **Cloudinary Storage Provider** (Production Cloud):
     - Enabled when `STORAGE_PROVIDER=cloudinary` and credentials are provided in `.env`.
     - Streams buffer securely via `cloudinary.uploader.upload_stream` into `konnevia/providers` folder.
     - Generates secure CDN HTTPS URLs.
4. **Metadata Persistence in MongoDB**:
   Binary files are **never** stored directly in MongoDB documents. Instead, structured metadata is persisted in `Lead.shopImage` and transferred to `Provider.shopImage`:
   ```javascript
   shopImage: {
     url: String,          // e.g. "/uploads/shop-179455...jpg" or "https://res.cloudinary.com/..."
     publicId: String,     // Unique storage identifier for deletions/modifications
     originalName: String, // Original client filename
     mimeType: String,     // "image/jpeg"
     size: Number,         // File size in bytes
     uploadedAt: Date      // Timestamp of receipt
   }
   ```

---

## 3. Administrative Review & Publication Workflow

### 3.1 Desk Verification Screen (`AdminApplicationDetailPage.jsx`)
- Displays the uploaded shop photo in an image card.
- Lightbox Modal: Clicking the photo opens a high-resolution lightbox view for visual inspection of branding, signage, and establishment authenticity.
- Reviewing operator compares physical shop evidence against registered city and address.

### 3.2 Automated Promotion to Provider Profile
Upon administrator approval:
- An approved `Lead` record (`type: 'partner'`) creates or updates a `Provider` record.
- The `shopImage` object is cleanly copied into `Provider.shopImage`.
- Verification status is marked `VERIFIED`.
- Publication status is initialized to `DRAFT` (never automatically published).

### 3.3 Public Visibility & Consent Gating
- Only providers with `verificationStatus === 'VERIFIED'` AND `publicationStatus === 'PUBLISHED'` are exposed through public endpoints (`/api/v1/providers` and `/api/v1/providers/:slug`).
- If `consentToDisplayPhone === false`, `contactNumber` is sanitized to `null` before sending to the client.
- Shop image URLs for unverified or draft providers are strictly inaccessible through public marketplace catalog endpoints.
