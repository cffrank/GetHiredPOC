# Backend Profile API Updates - Summary

## Overview
Updated the backend profile API to support the new user schema fields introduced in Week 2, while maintaining backward compatibility with legacy fields.

---

## Files Modified

### 1. `packages/backend/src/routes/profile.ts`

**Changes:**
- Added support for new structured user fields
- Added validation for phone, zip_code, and state
- Compute backward compatibility fields automatically
- Updated SELECT queries to include all fields

#### New Fields Accepted (PUT & PATCH endpoints)
- `first_name` - User's first name
- `last_name` - User's last name
- `phone` - Phone number (validated: 10 or 11 digits)
- `street_address` - Street address
- `city` - City
- `state` - 2-letter US state code (validated)
- `zip_code` - Zip code (validated: 12345 or 12345-6789)

#### Legacy Fields (Backward Compatibility)
- `full_name` - Still accepted, computed from first_name + last_name if those are provided
- `address` - Still accepted, computed from street_address, city, state, zip_code if those are provided

#### Validation Added
```typescript
// Phone validation
if (updates.phone && !validatePhone(updates.phone)) {
  return c.json({ error: "Invalid phone number format. Must be 10 or 11 digits." }, 400);
}

// Zip code validation
if (updates.zip_code && !validateZipCode(updates.zip_code)) {
  return c.json({ error: "Invalid zip code format. Must be 12345 or 12345-6789." }, 400);
}

// State validation
if (updates.state && !validateState(updates.state)) {
  return c.json({ error: "Invalid state code. Must be a valid 2-letter US state code." }, 400);
}
```

#### Backward Compatibility Logic
```typescript
// Compute full_name from first_name + last_name
if (updates.first_name || updates.last_name) {
  const firstName = updates.first_name || user.first_name || '';
  const lastName = updates.last_name || user.last_name || '';
  updates.full_name = `${firstName} ${lastName}`.trim();
}

// Compute address from structured fields
if (updates.street_address || updates.city || updates.state || updates.zip_code) {
  const street = updates.street_address || user.street_address || '';
  const city = updates.city || user.city || '';
  const state = updates.state || user.state || '';
  const zip = updates.zip_code || user.zip_code || '';
  updates.address = `${street}, ${city}, ${state} ${zip}`.trim();
}
```

#### Updated SELECT Queries
Added new fields to all SELECT queries:
```sql
SELECT id, email, full_name, first_name, last_name, phone,
  street_address, city, state, zip_code, address,
  bio, location, skills, avatar_url, linkedin_url, role,
  membership_tier, membership_started_at, membership_expires_at, trial_started_at,
  is_trial, trial_expires_at,
  subscription_tier, subscription_status, subscription_started_at, subscription_expires_at,
  polar_customer_id, polar_subscription_id,
  created_at, updated_at
FROM users WHERE id = ?
```

---

### 2. `packages/backend/src/services/auth.service.ts`

**Changes:**
- Updated `getSession()` SELECT query to include new fields
- Updated `login()` SELECT query to include all fields (full_name and address)

#### getSession() Updates
Added new fields to ensure the user object returned from session has all profile data:
```typescript
const user = await env.DB.prepare(
  `SELECT id, email, full_name, first_name, last_name, phone,
   street_address, city, state, zip_code, address,
   bio, location, skills, avatar_url, linkedin_url, role,
   membership_tier, membership_started_at, membership_expires_at, trial_started_at,
   subscription_tier, subscription_status, subscription_started_at, subscription_expires_at,
   polar_customer_id, polar_subscription_id, trial_expires_at, is_trial,
   created_at, updated_at
   FROM users WHERE id = ?`
)
```

#### login() Updates
Added backward compatibility fields (full_name, address) that were missing:
```typescript
const result = await env.DB.prepare(
  `SELECT id, email, password_hash, full_name,
   first_name, last_name, phone,
   street_address, city, state, zip_code, address,
   bio, location, skills, avatar_url, linkedin_url, role,
   membership_tier, membership_started_at, membership_expires_at, trial_started_at,
   subscription_tier, subscription_status, subscription_started_at, subscription_expires_at,
   polar_customer_id, polar_subscription_id, trial_expires_at, is_trial,
   created_at, updated_at
   FROM users WHERE email = ?`
)
```

---

## API Endpoints Updated

### GET /api/profile
**Response includes new fields:**
```json
{
  "profile": {
    "id": "user-id",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "phone": "5551234567",
    "street_address": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip_code": "94102",
    "address": "123 Main St, San Francisco, CA 94102",
    "bio": "...",
    "location": "San Francisco, CA",
    "skills": "[\"React\", \"TypeScript\"]",
    "avatar_url": "...",
    "linkedin_url": "...",
    ...
  }
}
```

### PUT /api/profile
**Accepts new fields in JSON body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "5551234567",
  "street_address": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "zip_code": "94102",
  "bio": "Senior Software Engineer",
  "location": "San Francisco, CA",
  "skills": ["React", "TypeScript", "Node.js"],
  "linkedin_url": "https://linkedin.com/in/johndoe"
}
```

**Also accepts fields via FormData (with file upload):**
```
FormData fields:
- first_name
- last_name
- phone
- street_address
- city
- state
- zip_code
- bio
- location
- skills (JSON string)
- linkedin_url
- avatar (File)
```

**Validation errors (400):**
- "Invalid phone number format. Must be 10 or 11 digits."
- "Invalid zip code format. Must be 12345 or 12345-6789."
- "Invalid state code. Must be a valid 2-letter US state code."

### PATCH /api/profile
Same functionality as PUT (partial updates supported).

---

## Testing Checklist

### Unit Tests
- [ ] Validate phone number accepts 10 digits: `5551234567`
- [ ] Validate phone number accepts 11 digits: `15551234567`
- [ ] Validate phone number rejects invalid: `123`, `abc`, `555-123-4567`
- [ ] Validate zip code accepts 5 digits: `94102`
- [ ] Validate zip code accepts 5+4 format: `94102-1234`
- [ ] Validate zip code rejects invalid: `123`, `94102-`, `abcde`
- [ ] Validate state accepts 2-letter codes: `CA`, `NY`, `TX`
- [ ] Validate state rejects invalid: `California`, `ZZ`, `1A`

### Integration Tests
- [ ] GET /api/profile returns all new fields
- [ ] PUT /api/profile with new fields updates correctly
- [ ] PUT /api/profile computes full_name from first_name + last_name
- [ ] PUT /api/profile computes address from structured fields
- [ ] PUT /api/profile with FormData + avatar works
- [ ] PUT /api/profile validation errors return 400
- [ ] PATCH /api/profile with new fields updates correctly
- [ ] Legacy full_name field still updates database
- [ ] Legacy address field still updates database
- [ ] Skills array serialization works

### E2E Tests
- [ ] Signup creates user with all fields
- [ ] Login returns user with all fields
- [ ] Profile edit form saves all fields
- [ ] Profile displays first_name, last_name correctly
- [ ] Profile displays phone number correctly
- [ ] Profile displays full address correctly
- [ ] Avatar upload still works
- [ ] Backward compatibility: old clients still work

---

## Backward Compatibility Strategy

### For Existing Users
1. **Old schema users** (have `full_name`, `address`):
   - Can update to new schema by editing profile
   - Legacy fields preserved in database
   - Frontend displays legacy data if new fields empty

2. **New schema users** (have structured fields):
   - Always have `full_name` and `address` computed automatically
   - Old clients can still read `full_name` and `address`

3. **Mixed updates**:
   - If user updates via old client: Uses `full_name` and `address`
   - If user updates via new client: Uses structured fields, computes legacy fields
   - Database always has both sets of fields populated

### Migration Path
```
Week 1: Database migration added columns
Week 2: Frontend updated to use new fields
Week 3: Backend API updated to accept new fields ✅ (This update)
Week 4: All users migrated to new schema (optional background job)
Week 5+: Can deprecate legacy fields (not recommended, keep for safety)
```

---

## Database Schema (Reminder)

```sql
-- New structured fields (added in migration 0019)
first_name TEXT
last_name TEXT
phone TEXT
street_address TEXT
city TEXT
state TEXT
zip_code TEXT

-- Legacy fields (backward compatibility)
full_name TEXT
address TEXT
```

---

## Security Considerations

### Validation
- ✅ Phone number validated server-side
- ✅ Zip code validated server-side
- ✅ State code validated server-side
- ✅ SQL injection prevented (prepared statements)
- ✅ Authorization checked (requireAuth middleware)

### Privacy
- Phone number stored but not exposed in public APIs
- Address stored for resume generation only
- No PII logged in console (except debug mode)

---

## Performance Impact

### Minimal Impact
- Added fields are simple TEXT columns (no indexes needed)
- Backward compatibility computation is O(1) string concatenation
- SELECT queries return slightly more data (~100 bytes per user)
- No additional database queries needed

### Optimizations
- Computed fields (full_name, address) cached in database
- No need to recompute on every read
- User embedding invalidation still triggers on profile update

---

## Next Steps

### Immediate
- [ ] Test profile updates in local development
- [ ] Verify backward compatibility with old clients
- [ ] Test with real user data

### Short-term
- [ ] Update API documentation
- [ ] Add monitoring for validation errors
- [ ] Consider adding phone number formatting on server

### Long-term
- [ ] Background job to migrate old users to new schema
- [ ] Analytics on field completion rates
- [ ] Consider deprecating legacy fields (1+ year timeline)

---

## Summary

✅ **Backend profile API fully updated** to support new user schema fields
✅ **Validation added** for phone, zip code, and state
✅ **Backward compatibility maintained** via computed fields
✅ **All SELECT queries updated** to return new fields
✅ **Both PUT and PATCH endpoints** accept new fields
✅ **FormData support** for multipart uploads with new fields

**Status:** Ready for testing and deployment
**Breaking Changes:** None (backward compatible)
**Migration Required:** No (database migration already applied in Week 1)
