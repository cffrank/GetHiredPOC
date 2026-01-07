# Firebase Integration Plan for JobMatch AI

## Overview
Integrate Firebase backend services (Authentication, Firestore, Storage, Functions) into the JobMatch AI application. Currently, the app is frontend-only with mock data and no authentication.

## User Requirements
- **Authentication**: Email/Password, Google OAuth, LinkedIn OAuth
- **Data Migration**: Import existing mock data into Firestore for testing
- **Backend Logic**: Cloud Functions for sensitive operations (AI, payments)
- **File Storage**: Firebase Storage for resumes, photos, invoices

## Current State
- React 19 + Vite + TypeScript
- No authentication implemented (hardcoded user)
- All data from static JSON files loaded at build time
- 5 main sections: Profile, Jobs, Applications, Tracker, Account
- Firebase project exists: `ai-career-os-139db`

## Critical Bugs to Fix (from TestSprite)
1. **ApplicationEditorPage.tsx:12** - null reference error reading undefined.find()
2. **ApplicationList.tsx:71** - undefined filter error
3. **LinkedIn OAuth flow** - wizard not accessible

---

## PHASE 1: Firebase Setup & Authentication

### Dependencies
```bash
npm install firebase@10 react-firebase-hooks sonner
```

### Files to Create
- `/jobmatch-ai/src/lib/firebase.ts` - Firebase SDK initialization
- `/jobmatch-ai/src/lib/auth.ts` - Auth utilities
- `/jobmatch-ai/src/contexts/AuthContext.tsx` - Auth state provider
- `/jobmatch-ai/src/hooks/useAuth.ts` - Auth hook
- `/jobmatch-ai/src/components/ProtectedRoute.tsx` - Route guard
- `/jobmatch-ai/src/pages/LoginPage.tsx` - Login/signup UI
- `/jobmatch-ai/.env.local` - Firebase config (gitignored)

### Files to Modify
- `/jobmatch-ai/src/lib/router.tsx` - Add protected routes & login routes
- `/jobmatch-ai/src/components/AppLayout.tsx` - Replace hardcoded user with useAuth()
- `/jobmatch-ai/src/main.tsx` - Wrap app in AuthProvider

### Implementation Steps
1. Initialize Firebase SDK with project config
2. Enable Email/Password, Google, LinkedIn auth in Firebase Console
3. Create AuthContext with signIn, signUp, signOut, resetPassword
4. Build login/signup pages with form validation
5. Wrap all app routes in ProtectedRoute component
6. Update AppLayout to use real user from auth context
7. Add toast notifications with sonner

### Firebase Console Setup
- Enable Authentication providers
- Configure authorized domains (localhost, production)
- Set up OAuth consent screens

---

## PHASE 2: Firestore Database

### Files to Create
- `/jobmatch-ai/firestore.rules` - Security rules
- `/jobmatch-ai/firestore.indexes.json` - Query indexes
- `/jobmatch-ai/scripts/migrate-mock-data.ts` - Data migration script
- `/jobmatch-ai/src/hooks/useProfile.ts` - Profile CRUD hook
- `/jobmatch-ai/src/hooks/useWorkExperience.ts` - Experience CRUD
- `/jobmatch-ai/src/hooks/useEducation.ts` - Education CRUD
- `/jobmatch-ai/src/hooks/useSkills.ts` - Skills CRUD
- `/jobmatch-ai/src/hooks/useResumes.ts` - Resumes CRUD
- `/jobmatch-ai/src/hooks/useJobs.ts` - Jobs queries
- `/jobmatch-ai/src/hooks/useApplications.ts` - Applications CRUD
- `/jobmatch-ai/src/hooks/useTrackedApplications.ts` - Tracker CRUD
- `/jobmatch-ai/src/hooks/useSubscription.ts` - Subscription data

### Firestore Collections Schema
```
users/{userId}
  - profile data (name, email, photo, etc.)
  /workExperience/{id} - work history
  /education/{id} - education history
  /skills/{id} - skills list
  /resumes/{id} - master & tailored resumes
  /savedJobs/{jobId} - bookmarked jobs
  /applications/{id} - AI-generated applications
  /trackedApplications/{id} - application tracker
  /subscription - billing & plan info
  /invoices/{id} - billing history

jobs/{jobId}
  - job listings (readable by all, writable by functions only)
```

### Security Rules Pattern
```javascript
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
  match /{document=**} {
    allow read, write: if request.auth.uid == userId;
  }
}

match /jobs/{jobId} {
  allow read: if request.auth != null;
  allow write: if false; // Functions only
}
```

### Implementation Steps
1. Create Firestore hooks using react-firebase-hooks
2. Write security rules and deploy
3. Create indexes for common queries
4. Build data migration script to import mock JSON data
5. Replace all data.json imports with Firestore hooks
6. Add loading states and error handling
7. Implement optimistic updates for better UX

---

## PHASE 3: Firebase Storage

### Files to Create
- `/jobmatch-ai/storage.rules` - Storage security rules
- `/jobmatch-ai/src/hooks/useFileUpload.ts` - Generic upload hook
- `/jobmatch-ai/src/hooks/useProfilePhoto.ts` - Avatar upload
- `/jobmatch-ai/src/hooks/useResumeExport.ts` - PDF/DOCX export

### Storage Bucket Structure
```
users/{userId}/
  profile/avatar.jpg
  resumes/{resumeId}/resume.{pdf,docx,txt}
  cover-letters/{applicationId}/cover-letter.pdf
  invoices/{invoiceId}.pdf
  exports/{exportId}.zip
```

### Security Rules
```javascript
match /users/{userId}/{allPaths=**} {
  allow read, write: if request.auth.uid == userId;
}
```

### Implementation Steps
1. Create file upload hooks with progress callbacks
2. Add file type validation (PDF, DOCX, images)
3. Implement file size limits (5MB resumes, 2MB photos)
4. Update AccountSettings to upload profile photos
5. Update ResumeActions to store/download from Storage
6. Update ApplicationEditor to store exported PDFs

---

## PHASE 4: Cloud Functions

### Setup
```bash
cd jobmatch-ai
firebase init functions
# Choose TypeScript
```

### Functions to Create
```
functions/src/
  index.ts - Export all functions
  ai/
    generateApplication.ts - AI resume/cover letter generation
    calculateJobMatch.ts - Job matching algorithm
    optimizeResume.ts - Resume optimization suggestions
  webhooks/
    linkedInCallback.ts - LinkedIn OAuth callback
    stripeWebhook.ts - Stripe billing webhook
  scheduled/
    scrapeJobs.ts - Daily job board scraping
    sendReminders.ts - Follow-up email reminders
```

### Key Functions

**generateApplication** (onCall):
- Input: jobId
- Fetch user profile + job details
- Call OpenAI API for tailored resume + cover letter
- Return 2-3 variants with AI rationale
- Store in users/{uid}/applications/{id}

**linkedInCallback** (onRequest):
- Handle OAuth callback from LinkedIn
- Exchange code for access token
- Fetch profile, work experience, education, skills
- Import to Firestore
- Redirect to app

**stripeWebhook** (onRequest):
- Verify webhook signature
- Handle invoice.paid, subscription.updated events
- Update user subscription status

### Environment Config
```bash
firebase functions:config:set \
  openai.api_key="sk-..." \
  linkedin.client_id="..." \
  linkedin.client_secret="..." \
  stripe.secret_key="sk_..." \
  stripe.webhook_secret="whsec_..."
```

---

## PHASE 5: Fix Critical Bugs & Integration

### Bug Fixes

**1. ApplicationEditorPage.tsx:12 - Null Reference**
- **Current**: `const selectedVariant = application.variants.find(...)` where application can be undefined
- **Fix**: Replace static import with `useApplication(id)` hook, add loading/not-found states
- **Pattern**:
```typescript
const { application, loading } = useApplication(id!)
if (loading) return <LoadingSpinner />
if (!application) return <NotFoundPage />
// Now safe to access application.variants
```

**2. ApplicationList.tsx:71 - Undefined Filter**
- **Current**: Async data not handled properly
- **Fix**: Use `useApplications()` hook with proper defaults
- **Pattern**:
```typescript
const { applications = [], loading, error } = useApplications()
if (loading) return <LoadingSkeleton />
if (error) return <ErrorMessage error={error} />
const filtered = applications.filter(...)
```

**3. LinkedIn OAuth Flow**
- **Fix**: Implement LinkedIn OAuth via Cloud Function
- Create /api/linkedin/auth endpoint that redirects to LinkedIn
- Handle callback in /api/linkedin/callback
- Import profile data to Firestore

### Component Updates

**Replace all data.json imports with Firestore hooks:**

1. **ProfileOverviewPage** → `useProfile()`, `useWorkExperience()`, `useEducation()`, `useSkills()`
2. **JobListPage** → `useJobs()`
3. **JobDetailPage** → `useJob(id)`
4. **ApplicationListPage** → `useApplications()`
5. **ApplicationEditorPage** → `useApplication(id)` (fixes bug)
6. **ApplicationTrackerListPage** → `useTrackedApplications()`
7. **SettingsPage** → `useSubscription()`

**Convert console.log callbacks to real mutations:**
```typescript
// Before
const handleDelete = (id: string) => console.log('Delete:', id)

// After
const handleDelete = async (id: string) => {
  await deleteApplication(id)
  toast.success('Deleted')
}
```

### Add Loading States
- Create LoadingSpinner, LoadingSkeleton, ErrorBoundary components
- Wrap async operations with loading states
- Add optimistic updates for instant feedback

---

## Testing Strategy

### Unit Tests
- Test Firestore hooks with Firebase emulator
- Test auth flows (signup, login, logout)
- Test file upload utilities

### Integration Tests
- Run data migration script and verify
- Test Cloud Functions with emulator
- Test protected routes redirect

### E2E Tests (Re-run TestSprite)
- Sign up → Import LinkedIn → Browse jobs → Generate application → Track
- Verify all 13 test cases pass

---

## Deployment

### Firebase Console Setup
1. Enable billing on Firebase project
2. Configure OAuth providers (Google, LinkedIn)
3. Set up Stripe integration
4. Configure SendGrid/Mailgun for emails
5. Enable Firebase App Check for abuse prevention

### Deploy Commands
```bash
# Deploy Firestore rules & indexes
firebase deploy --only firestore

# Deploy Storage rules
firebase deploy --only storage

# Deploy Functions
firebase deploy --only functions

# Deploy Hosting
npm run build
firebase deploy --only hosting
```

### Environment Variables
- Add `.env.local` to `.gitignore`
- Store Firebase config in environment variables
- Use Firebase Functions config for secrets

---

## Critical Files Summary

**Most Important Files to Create/Modify:**

1. `/jobmatch-ai/src/lib/firebase.ts` - Core Firebase initialization
2. `/jobmatch-ai/src/contexts/AuthContext.tsx` - Authentication state
3. `/jobmatch-ai/src/hooks/useApplications.ts` - Fixes critical bug
4. `/jobmatch-ai/src/components/AppLayout.tsx` - Remove hardcoded user
5. `/jobmatch-ai/functions/src/ai/generateApplication.ts` - Core AI feature
6. `/jobmatch-ai/firestore.rules` - Security foundation
7. `/jobmatch-ai/scripts/migrate-mock-data.ts` - Import test data

---

## Success Criteria

✅ All users must authenticate before accessing the app
✅ All mock data successfully migrated to Firestore
✅ Profile photos and resumes stored in Firebase Storage
✅ AI resume generation works via Cloud Function
✅ All 13 TestSprite tests pass
✅ LinkedIn OAuth imports profile data
✅ ApplicationEditorPage and ApplicationList bugs fixed
✅ Real-time data sync working across all sections
✅ Firestore security rules prevent unauthorized access
