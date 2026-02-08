# Production Authentication System Implementation

## Architecture Overview

The authentication system will use a **server-side JWT token management** approach:

- **Server-side**: Next.js API routes handle login, token generation, and cookie management
- **Client-side**: React Context provides userID access, Zustand store manages auth state
- **Tokens**: Access tokens (short-lived) and refresh tokens (long-lived) stored in httpOnly cookies
- **API Calls**: Client-side API client automatically includes tokens from cookies via server-side proxy

## Data Flow

````javascript
User Login
  ↓
Client: Login Form → API Route: /api/auth/login
  ↓
API Route: Calls ERP Login API
  ↓
API Route: Generates JWT tokens (access + refresh)
  ↓
API Route: Sets httpOnly cookies
  ↓
Client: AuthContext initialized with userID
  ↓
All API Calls: Use tokens from cookies (via server proxy)
```

## Implementation Steps

### 1. Install Dependencies
- Add `jsonwebtoken` and `@types/jsonwebtoken` for JWT token generation
- Add `jose` (alternative, more modern) or stick with jsonwebtoken

### 2. Server-Side Authentication API Routes

#### 2.1 Create API Route Structure
- `app/api/auth/login/route.ts` - Handle login, generate tokens, set cookies
- `app/api/auth/refresh/route.ts` - Refresh access token using refresh token
- `app/api/auth/logout/route.ts` - Clear tokens and cookies
- `app/api/auth/reset-password/route.ts` - Handle password reset
- `app/api/auth/forgot-password/route.ts` - Handle forgot password
- `app/api/auth/me/route.ts` - Get current user info from token

#### 2.2 JWT Token Management
- Create `lib/auth/jwt.ts` for token generation and validation
- Access token: 15 minutes expiry
- Refresh token: 7 days expiry
- Store userID in token payload
- Use environment variables for JWT secret

#### 2.3 Cookie Management
- Create `lib/auth/cookies.ts` for cookie utilities
- httpOnly cookies for security
- Secure flag for HTTPS (production)
- SameSite: 'lax' for CSRF protection
- Separate cookies for access and refresh tokens

### 3. Client-Side Authentication Context

#### 3.1 Create AuthContext Provider
- `lib/contexts/auth-context.tsx` - React Context for userID and auth state
- Provides: `userID`, `isAuthenticated`, `isLoading`
- Initializes on app load by calling `/api/auth/me`
- Handles token refresh automatically

#### 3.2 Update Auth Store
- `lib/stores/auth-store.ts` - Update to work with new token system
- Remove password storage from localStorage
- Store only: `userID`, `isAuthenticated`, `username`
- Sync with AuthContext

### 4. API Client Updates

#### 4.1 Server-Side API Proxy
- Create `app/api/proxy/[...path]/route.ts` - Proxy all ERP API calls
- Automatically includes tokens from cookies
- Handles token refresh on 401 errors
- Forwards requests to ERP API

#### 4.2 Update Client API Client
- `lib/api/client.ts` - Update to call Next.js proxy routes instead of direct ERP calls
- Remove Basic Auth (now handled server-side)
- Add automatic token refresh handling

### 5. Route Protection

#### 5.1 Create Middleware
- `middleware.ts` - Protect routes at edge level
- Check for valid access token in cookies
- Redirect to login if not authenticated
- Allow public routes: `/login`, `/api/auth/*`

#### 5.2 Update Auth Guards
- `components/layout/auth-guard.tsx` - Update to use AuthContext
- `components/layout/public-guard.tsx` - Update to use AuthContext
- Remove dependency on Zustand store for auth checks

### 6. Form Cleanup & UserID Integration

#### 6.1 Remove Old Form
- Delete `app/(protected)/voucher-form-2/` directory
- Delete `components/forms/voucher2-form.tsx` (if exists)
- Update sidebar navigation if it references old form

#### 6.2 Update Hardcoded UserID References
- `components/forms/voucher-form.tsx`:
    - Replace `'temp'` in `postVouchers('temp')` with context userID
    - Replace `User_ID: 'temp'` with context userID
- `components/forms/cascading-dimension-select.tsx`:
    - Replace hardcoded `'SAM02799'` with context userID
- `lib/api/services/dimension.service.ts`:
    - Update `getWebUserSetup` default userId parameter

### 7. Login Form Updates

#### 7.1 Update Login Form
- `components/forms/login-form.tsx` - Call `/api/auth/login` instead of Zustand store
- Handle API errors properly
- Show loading states
- Redirect on success

#### 7.2 Add Forgot Password (on Login Page)
- Create `components/forms/forgot-password-form.tsx` - Simple form with userID and registeredMobileNo
- Add "Forgot Password?" link/button on login page (`app/(auth)/login/page.tsx`)
- Show form inline or in modal/dialog on login page (not separate route)
- API endpoint: `/api/auth/forgot-password`
- API response: `{ "value": "Password has been sent your registered mobile no." }`
- Show success message after submission

#### 7.3 Add Settings Page with Reset Password
- Create `app/(protected)/settings/page.tsx` - Settings page with sections:
    - **Account** section: Placeholder with "On the way" message
    - **Reset Password** section: Reset password form
- Create `components/forms/reset-password-form.tsx` - Form with:
    - `oldPassword` field
    - `newPassword` field
    - `confirmPassword` field (for validation)
- API endpoint: `/api/auth/reset-password`
- API response: `{ "value": "Password has been Sucussfully reset" }`
- Show success message after submission

#### 7.4 Update Sidebar Profile Dropdown
- `components/layout/sidebar.tsx`:
    - Update "Account" dropdown item to link to `/settings?tab=account` or `/account` route
    - Update "Settings" dropdown item to link to `/settings` route
    - Update user data to use AuthContext (username, userID from context instead of hardcoded)
    - Sidebar should dynamically show "Settings" section when on settings route (instead of "Forms")
    - Add Settings navigation item in sidebar when on settings page

### 8. App Initialization

#### 8.1 Root Layout Updates
- `app/layout.tsx` - Wrap app with AuthContextProvider
- Ensure context initializes before rendering protected routes
- Handle loading state during auth initialization

#### 8.2 Protected Layout Updates
- `app/(protected)/layout.tsx` - Use AuthContext instead of Zustand
- Show loading state while auth initializes
- Prevent flash of unauthenticated content

### 9. Environment Variables

Add to `.env.local`:
```
JWT_SECRET=your-secret-key-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

### 10. Error Handling & Security

- Handle token expiry gracefully
- Implement automatic token refresh
- Clear cookies on logout
- Handle network errors
- Add proper error messages for users
- Validate API responses properly

## Files to Create/Modify

**New Files:**
- `app/api/auth/login/route.ts`
- `app/api/auth/refresh/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/reset-password/route.ts`
- `app/api/auth/forgot-password/route.ts`
- `app/api/auth/me/route.ts`
- `app/api/proxy/[...path]/route.ts`
- `lib/auth/jwt.ts`
- `lib/auth/cookies.ts`
- `lib/contexts/auth-context.tsx`
- `components/forms/reset-password-form.tsx`
- `components/forms/forgot-password-form.tsx`
- `app/(protected)/settings/page.tsx` - Settings page with Account and Reset Password sections
- `app/(protected)/account/page.tsx` - Account page (placeholder for now)
- `middleware.ts`

**Modified Files:**
- `lib/stores/auth-store.ts`
- `lib/api/client.ts`
- `components/forms/login-form.tsx`
- `components/layout/auth-guard.tsx`
- `components/layout/public-guard.tsx`
- `components/layout/sidebar.tsx` - Update profile dropdown links and user data
- `app/layout.tsx`
- `app/(protected)/layout.tsx`
- `app/(auth)/login/page.tsx` - Add forgot password UI
- `components/forms/voucher-form.tsx`
- `components/forms/cascading-dimension-select.tsx`
- `lib/api/services/dimension.service.ts`

**Deleted Files:**
- `app/(protected)/voucher-form-2/` (entire directory)
- `components/forms/voucher2-form.tsx` (if exists)

## Security Considerations

1. **Tokens in httpOnly cookies** - Prevents XSS attacks
2. **Secure flag** - Only send cookies over HTTPS in production
3. **SameSite: 'lax'** - CSRF protection
4. **Short-lived access tokens** - Minimize exposure if compromised
5. **Server-side token validation** - Never trust client-side tokens
6. **No password storage** - Passwords never stored, only used for login
7. **Automatic token refresh** - Seamless user experience

## Testing Checklist

- [ ] Login flow works correctly
- [ ] Tokens are set in httpOnly cookies
- [ ] UserID is accessible via context throughout app
- [ ] Protected routes redirect to login when not authenticated
- [ ] Token refresh works automatically
- [ ] Logout clears cookies and redirects
- [ ] Password reset flow works (from Settings page)
- [ ] Forgot password flow works (from login page)
- [ ] Settings page shows correct sections (Account placeholder, Reset Password form)
- [ ] Sidebar updates to show "Settings" when on settings route
- [ ] Profile dropdown links work correctly (Account and Settings)
- [ ] All hardcoded userIDs replaced with context
- [ ] Old form removed and references updated
- [ ] Auth context initializes properly on app load


````
