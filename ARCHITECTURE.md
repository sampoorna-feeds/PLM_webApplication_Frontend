# Architecture Documentation

## Overview

This ERP UI system follows a production-level, layered architecture pattern that separates concerns and promotes maintainability, testability, and scalability.

## Architecture Layers

The system is organized into distinct layers, each with a specific responsibility:

```
┌─────────────────────────────────────────┐
│         UI Components Layer             │
│  (app/, components/)                    │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         State Management Layer          │
│  (lib/stores/, lib/contexts/)           │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Service Layer                   │
│  (lib/services/)                        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Data Layer                      │
│  (lib/data/)                            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         API Layer                       │
│  (lib/api/)                             │
└─────────────────────────────────────────┘
```

## Layer Responsibilities

### 1. API Layer (`lib/api/`)

**Purpose**: Handles all HTTP communication with the ERP backend.

**Responsibilities**:

- Base API client configuration
- Authentication header management
- Request/response handling
- Error handling and transformation
- OData V4 query building

**Key Files**:

- `client.ts` - Base API client with authentication
- `endpoints.ts` - Centralized endpoint definitions
- `types.ts` - API response types

**Rules**:

- ✅ All API calls go through this layer
- ✅ Never expose credentials in client-side code
- ✅ Handle errors consistently
- ❌ Never call API directly from components or services

**Example**:

```typescript
// lib/api/client.ts
export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: "GET" });
}
```

### 2. Data Layer (`lib/data/`)

**Purpose**: Transforms data between API format and application format.

**Responsibilities**:

- Normalize API responses
- Transform data structures
- Type mapping (API types → App types)
- Data validation and sanitization

**Rules**:

- ✅ Pure functions only (no side effects)
- ✅ One transformation function per entity type
- ✅ Handle null/undefined gracefully
- ❌ No API calls
- ❌ No business logic

**Example**:

```typescript
// lib/data/user-data.ts
export function transformUser(apiUser: ApiUser): User {
  return {
    id: apiUser.Id,
    name: apiUser.Name,
    email: apiUser.Email,
    // ... transform other fields
  };
}
```

### 3. Service Layer (`lib/services/`)

**Purpose**: Contains business logic and orchestrates API calls.

**Responsibilities**:

- Business logic implementation
- Orchestrating API calls
- Data transformation coordination
- Caching strategy coordination
- Error handling and user-friendly messages

**Rules**:

- ✅ All business logic lives here
- ✅ Use API layer for HTTP calls
- ✅ Use data layer for transformations
- ✅ Return app types, not API types
- ❌ No direct API calls (use API layer)
- ❌ No UI logic
- ❌ No state management (use stores)

**Example**:

```typescript
// lib/services/user-service.ts
import { apiGet } from "@/lib/api/client";
import { transformUser } from "@/lib/data/user-data";
import type { User } from "@/types";

export async function getUserById(id: string): Promise<User> {
  const apiUser = await apiGet<ApiUser>(`/Users(${id})`);
  return transformUser(apiUser);
}
```

### 4. State Management Layer (`lib/stores/`, `lib/contexts/`)

**Purpose**: Manages global application state.

**Responsibilities**:

- Authentication state (Zustand)
- User preferences
- Global UI state
- Server state caching (TanStack Query)

**Rules**:

- ✅ Use Zustand for global client state
- ✅ Use TanStack Query for server state
- ✅ Keep stores focused (one store per domain)
- ✅ Use persist middleware for critical state
- ❌ No business logic in stores
- ❌ No API calls in stores (use services)

**Example**:

```typescript
// lib/stores/auth-store.ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (username, password) => {
        // Update state only
      },
    }),
    { name: "auth-storage" },
  ),
);
```

### 5. UI Components Layer (`app/`, `components/`)

**Purpose**: User interface and user interactions.

**Responsibilities**:

- Rendering UI
- User interactions
- Form handling
- Loading and error states
- Route management

**Rules**:

- ✅ Use shadcn/ui components
- ✅ Use TanStack Query hooks for data fetching
- ✅ Use Zustand stores for global state
- ✅ Use TanStack Form for forms
- ✅ Keep components small and focused
- ❌ No direct API calls (use services)
- ❌ No business logic (use services)
- ❌ No data transformation (use data layer)

**Example**:

```typescript
// components/features/user-profile.tsx
export function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => userService.getUserById(userId),
  });

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return <div>{data.name}</div>;
}
```

## Data Flow

### Reading Data (Query)

```
Component
  ↓ useQuery
Service Layer
  ↓ apiGet/apiPost
API Layer
  ↓ HTTP Request
Backend API
  ↓ Response
API Layer
  ↓ Transform
Data Layer
  ↓ Return
Service Layer
  ↓ Return
Component (via TanStack Query)
```

### Writing Data (Mutation)

```
Component
  ↓ useMutation
Service Layer
  ↓ Validate & Transform
Data Layer
  ↓ Transform
Service Layer
  ↓ apiPost/apiPatch
API Layer
  ↓ HTTP Request
Backend API
  ↓ Response
API Layer
  ↓ Transform
Data Layer
  ↓ Return
Service Layer
  ↓ Update Store (if needed)
State Management
  ↓ Return
Component (via TanStack Query)
```

## Route Organization

### Public Routes (`app/(auth)/`)

Routes that don't require authentication:

- `/login` - Login page

### Protected Routes (`app/(protected)/`)

Routes that require authentication:

- All routes inside `(protected)` route group
- Layout includes sidebar navigation
- Authentication check in layout or middleware

## Authentication Flow

1. User enters credentials on login page
2. Login form validates input (Zod)
3. Form submits to auth service
4. Auth service validates credentials (currently dummy: test/test)
5. On success, auth store updates with user and credentials
6. User redirected to protected routes
7. All API calls use credentials from auth store
8. Protected layout checks auth state

## State Management Strategy

### When to Use Each Approach

**Zustand Stores** (`lib/stores/`):

- Authentication state
- User preferences
- Global UI state (theme, sidebar open/closed)
- Client-side only state

**TanStack Query** (`@tanstack/react-query`):

- Server state (data from API)
- Caching API responses
- Background refetching
- Optimistic updates

**Local State** (`useState`):

- Component-specific UI state
- Form field values (before submission)
- Temporary UI state (modals, dropdowns)

## Error Handling Strategy

### API Errors

- Caught in API layer
- Transformed to consistent error format
- Passed to service layer
- Service layer adds user-friendly messages
- Components display errors to users

### Form Errors

- Validated with Zod schemas
- Displayed inline with form fields
- Prevent submission on validation errors

### React Errors

- Caught by Error Boundaries
- Display fallback UI
- Log errors for debugging

## Type Safety

### Type Flow

```
API Types (lib/api/types.ts)
  ↓
Data Transformation (lib/data/)
  ↓
App Types (types/)
  ↓
Service Layer (lib/services/)
  ↓
Components (app/, components/)
```

### Rules

- ✅ Define types for all API responses
- ✅ Transform API types to app types in data layer
- ✅ Use app types in services and components
- ✅ No `any` types - use `unknown` if type is truly unknown
- ✅ Use type guards for runtime type checking

## Testing Strategy

### Unit Tests

- **Services**: Test business logic
- **Data Layer**: Test transformations
- **Validations**: Test Zod schemas
- **Utils**: Test utility functions

### Integration Tests

- **API Layer**: Mock HTTP requests
- **Service + API**: Test service with mocked API

### Component Tests

- **Forms**: Test validation and submission
- **Components**: Test rendering and interactions

## Best Practices Summary

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Dependency Direction**: Layers only depend on layers below them
3. **Type Safety**: Use TypeScript types throughout
4. **Error Handling**: Handle errors at appropriate layers
5. **Code Reusability**: Extract common logic to appropriate layers
6. **Testability**: Keep functions pure and testable
7. **Maintainability**: Follow consistent patterns and naming

## Common Patterns

### Creating a New Feature

1. **Define API Types** (`lib/api/types.ts`)

   ```typescript
   export interface ApiUser { ... }
   ```

2. **Add Endpoint** (`lib/api/endpoints.ts`)

   ```typescript
   export const userEndpoints = { getById: (id: string) => `/Users(${id})` };
   ```

3. **Create Data Transform** (`lib/data/user-data.ts`)

   ```typescript
   export function transformUser(api: ApiUser): User { ... }
   ```

4. **Create Service** (`lib/services/user-service.ts`)

   ```typescript
   export async function getUserById(id: string): Promise<User> { ... }
   ```

5. **Create Component** (`components/features/user-profile.tsx`)

   ```typescript
   export function UserProfile() {
     const { data } = useQuery({ queryFn: () => userService.getUserById(id) });
     return <div>...</div>;
   }
   ```

6. **Add to Route** (`app/(protected)/users/[id]/page.tsx`)
   ```typescript
   export default function UserPage() {
     return <UserProfile />;
   }
   ```

## Future Considerations

- **API Type Generation**: Consider generating types from OData metadata
- **Caching Strategy**: Implement more sophisticated caching with TanStack Query
- **Offline Support**: Consider service workers for offline functionality
- **Real-time Updates**: Consider WebSockets or polling for real-time data
- **Performance**: Implement code splitting and lazy loading
- **Monitoring**: Add error tracking and performance monitoring
