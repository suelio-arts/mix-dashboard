# MIX Admin Dashboard Setup

## Overview

The admin dashboard (`admin.html`) provides authenticated access to analytics, tour management, content settings, and system configuration. Access is restricted to authorized admin users via Google Sign-In.

## Authentication Architecture

- **Login**: Google Sign-In popup
- **Authorization**: Email-based role checking via Firestore `admin_users` collection
- **Session**: Firebase Auth state persistence
- **Access Control**: Admin-only tabs embedded in authenticated interface

## Firestore Schema

### admin_users Collection

Each document uses the admin's email as the document ID.

```typescript
// Collection: admin_users
// Document ID: admin email (e.g., "deniz@suelio.com")
{
  email: string;           // Admin email address (same as doc ID)
  isAdmin: boolean;        // Must be true for access
  displayName?: string;    // Optional display name
  createdAt: Timestamp;    // When admin access was granted
  createdBy?: string;      // Who granted the access
  permissions?: string[];  // Reserved for future granular permissions
}
```

## Adding New Admin Users

### Method 1: Firebase Console (Recommended)

1. Open Firebase Console: https://console.firebase.google.com/
2. Navigate to **Firestore Database**
3. Select the `admin_users` collection (create if doesn't exist)
4. Click **Add document**
5. Set **Document ID** to the admin's email (e.g., `deniz@suelio.com`)
6. Add fields:
   ```
   email: deniz@suelio.com
   isAdmin: true
   displayName: Deniz Aydemir
   createdAt: [use Firebase timestamp helper]
   ```
7. Click **Save**

### Method 2: Node.js Script

```javascript
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function addAdmin(email, displayName = '') {
  await db.collection('admin_users').doc(email).set({
    email,
    isAdmin: true,
    displayName,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: 'system',
    permissions: []
  });
  console.log(`✓ Added admin: ${email}`);
}

// Usage:
addAdmin('deniz@suelio.com', 'Deniz Aydemir');
```

### Method 3: Firebase CLI (Quickest for Testing)

```bash
# Install Firebase Admin SDK globally
npm install -g firebase-admin

# Create a temporary script
cat > add-admin.js << 'EOF'
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = process.argv[2];
if (!email) {
  console.error('Usage: node add-admin.js <email>');
  process.exit(1);
}

admin.firestore().collection('admin_users').doc(email).set({
  email,
  isAdmin: true,
  createdAt: admin.firestore.FieldValue.serverTimestamp()
}).then(() => {
  console.log(`✓ Added admin: ${email}`);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
EOF

# Run it
node add-admin.js deniz@suelio.com
```

## Access Flow

1. User visits `admin.html`
2. Clicks "Sign in with Google"
3. Google OAuth popup appears
4. User signs in with Google account
5. System checks `admin_users/{email}` in Firestore
6. If `isAdmin === true`: Show admin interface
7. If not found or `isAdmin === false`: Show "Access denied" error and sign out

## Security Considerations

### Current Implementation

- ✅ Firebase Authentication (Google OAuth)
- ✅ Firestore role checking (admin_users collection)
- ✅ Client-side access control (tabs hidden if not admin)
- ⚠️ **No server-side validation** - dashboard reads Firestore directly with client SDK

### Security Rules Required

The `admin_users` collection should have strict Firestore Security Rules:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin users collection - read-only for authenticated users, write-only for admins
    match /admin_users/{email} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      get(/databases/$(database)/documents/admin_users/$(request.auth.token.email)).data.isAdmin == true;
    }
  }
}
```

**Important**: Apply these rules to prevent unauthorized modification of admin status.

### Future Enhancements

- Server-side API endpoints with admin verification
- Firebase Functions for sensitive operations
- Granular permissions (read-only admins, content moderators, etc.)
- Audit logging for admin actions

## Tabs Structure

### 📊 Analytics (Active)

- Embeds existing `dashboard.html` as iframe
- Shows location tracking, user stats, and activity visualization
- No changes to existing functionality

### 🗺️ Tours (Placeholder)

- Tour completion rates
- User drop-off analysis
- Location visit heatmaps
- **Implementation**: Requires `tour-visit-tracking` PRD

### 📝 Content (Placeholder)

- Narrative settings configuration
- Story template management
- Content moderation tools
- **Implementation**: Requires `narrative-admin-dashboard` PRD

### ⚙️ Settings (Placeholder)

- Admin user management
- System configuration
- API keys and integrations

## Local Development

1. Serve the dashboard locally:
   ```bash
   cd mix-dashboard
   python3 -m http.server 8000
   ```

2. Open http://localhost:8000/admin.html

3. Sign in with authorized Google account

## Troubleshooting

### "Access denied" Error

- **Cause**: Email not in `admin_users` collection or `isAdmin: false`
- **Fix**: Add email to Firestore (see "Adding New Admin Users")

### Google Sign-In Popup Blocked

- **Cause**: Browser popup blocker
- **Fix**: Allow popups for localhost or your domain

### "Checking access..." Never Completes

- **Cause**: Firestore read error or network issue
- **Fix**: Check browser console for errors, verify Firebase config

### Analytics Tab Shows Blank Page

- **Cause**: `dashboard.html` not found or has errors
- **Fix**: Ensure `dashboard.html` exists in same directory

## Production Deployment

The admin dashboard is served via Firebase Hosting alongside the existing dashboard:

- **Public dashboard**: https://suelio-ar.web.app/dashboard.html (no auth)
- **Admin dashboard**: https://suelio-ar.web.app/admin.html (auth required)

Update `firebase.json` if needed to include admin.html in hosting configuration.

## First-Time Setup Checklist

- [ ] Create `admin_users` collection in Firestore
- [ ] Add your email as first admin user (`isAdmin: true`)
- [ ] Apply Firestore Security Rules for `admin_users` collection
- [ ] Test sign-in with your Google account
- [ ] Verify "Access denied" for non-admin email
- [ ] Test all four tabs (Analytics should load, others show placeholders)
- [ ] Deploy to Firebase Hosting

## Next Steps

This PRD establishes the foundation. Future PRDs will populate the placeholder tabs:

- **tour-visit-tracking**: Adds tour analytics to Tours tab
- **narrative-admin-dashboard**: Adds narrative configuration to Content tab
- **weekly-engagement-stats**: Adds engagement metrics to Analytics tab
