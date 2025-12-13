---
description: "ERP UI System architecture guidelines, patterns, and best practices for Next.js 16 with layered architecture (API → Service → Store → Component)"
alwaysApply: true
---

# Cursor Rules for ERP UI System

## Architecture Overview

This is a Next.js 16 ERP UI system with production-level architecture. The system uses:
- **Next.js App Router** with route groups for protected routes
- **shadcn/ui** components for UI
- **TanStack Query** for API calls and data fetching
- **TanStack Form** for form validation
- **Zustand** for global state management
- **TypeScript** with strict mode

## Project Structure

```
sf-ui/
├── app/
│   ├── (auth)/              # Public/auth routes
│   │   └── login/
│   ├── (protected)/         # Protected routes (requires auth)
│   │   ├── layout.tsx       # Protected layout with sidebar
│   │   └── [dynamic-routes]/
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing/redirect page
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── forms/               # Form components
│   ├── layout/              # Layout components (Sidebar, Header, etc.)
│   └── features/            # Feature-specific components
├── lib/
│   ├── api/                 # API client and configuration
│   │   ├── client.ts        # Base API client with auth
│   │   ├── endpoints.ts     # API endpoint definitions
│   │   └── types.ts         # API response types
│   ├── services/            # Business logic layer
│   │   └── [feature]-service.ts
│   ├── stores/              # Zustand stores
│   │   ├── auth-store.ts    # Authentication state
│   │   └── [feature]-store.ts
│   ├── contexts/            # React contexts (if needed)
│   ├── data/                # Data transformation layer
│   │   └── [feature]-data.ts
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   └── validations/         # Validation schemas (Zod)
├── types/                   # Global TypeScript types
└── .env.example             # Environment variables template
```

## Key Architectural Patterns

### 1. API Layer (`lib/api/`)

- **Base client** with authentication headers (username/password/company)
- **Endpoint definitions** as constants
- **Type-safe** API responses
- **Error handling** and retry logic
- **OData V4** support for ERP APIs
- **Never expose credentials** in client-side code - use environment variables or server-side only

### 2. Service Layer (`lib/services/`)

- **Business logic** abstraction
- **Data transformation** before/after API calls
- **Caching strategies** coordination
- **No direct API calls** from components - always go through services
- Services are the **single source of truth** for API interactions

### 3. State Management (`lib/stores/`)

- **Zustand stores** for global state
- **Auth store** for user session and credentials
- **Feature stores** for domain-specific state
- **Persist middleware** for critical state (auth)
- Keep stores **focused and small** - one store per domain

### 4. Data Layer (`lib/data/`)

- **Data transformation** utilities
- **Normalization** of API responses
- **Type mapping** between API and app types
- **Pure functions** - no side effects

### 5. Protected Routes (`app/(protected)/`)

- **Route group** for all authenticated pages
- **Layout** with sidebar navigation
- **Middleware** or layout-based auth checks
- **User-based** page access control
- All routes inside `(protected)` require authentication

## Implementation Rules

### Authentication

- Use dummy credentials (`test`/`test`) for now - no API calls yet
- Store credentials in Zustand auth store
- No JWT - use Basic Auth with username/password/company for API calls
- API client automatically includes auth headers
- Auth state persists in localStorage via Zustand persist middleware
- **Never** hardcode credentials in code - use environment variables or store

### API Calls

- **Always** use TanStack Query hooks (`useQuery`, `useMutation`)
- **Never** call API directly from components
- **Always** go through service layer
- Use **typed** API responses
- Handle errors consistently
- Use **query keys** that follow a consistent pattern: `['feature', 'action', params]`
- Implement **optimistic updates** where appropriate

### Forms

- Use **TanStack Form** for all forms
- Use **Zod** for validation schemas
- Use **shadcn/ui** form components
- Extract validation schemas to `lib/validations/`
- **Always** validate on both client and server side
- Provide **clear error messages** to users

### Components

- Use **shadcn/ui** components from `components/ui/`
- Create **feature components** in `components/features/`
- Keep components **small and focused** (single responsibility)
- Use **TypeScript** for all props
- Prefer **server components** when possible
- Use **client components** only when needed (interactivity, hooks, state)
- **Never** create custom UI components that duplicate shadcn/ui functionality

### State Management

- **Zustand** for global state (auth, user preferences, etc.)
- **TanStack Query** for server state (API data)
- **Local state** (useState) for component-only state
- **No prop drilling** - use stores or context
- **Derive state** when possible instead of storing redundant data

### Error Handling

- **Consistent error types** across the app
- **User-friendly** error messages
- **Error boundaries** for React errors
- **API error handling** in service layer
- **Log errors** appropriately (console in dev, proper logging in prod)
- **Never** expose internal error details to users

### TypeScript

- **Strict mode** enabled
- **No `any` types** - use proper types or `unknown`
- **API types** generated or manually defined
- **Shared types** in `types/` directory
- Use **type guards** for runtime type checking
- Prefer **interfaces** for object shapes, **types** for unions/intersections

### Code Organization

- **One feature per file** (when possible)
- **Barrel exports** (`index.ts`) for clean imports
- **Consistent naming**: `kebab-case` for files, `PascalCase` for components
- **Separate concerns**: API, services, stores, components
- **Group related files** together (feature-based organization)

## Environment Variables

Environment variables should be defined in `.env.example`:
- `NEXT_PUBLIC_API_BASE_URL` - Base URL for ERP API
- `NEXT_PUBLIC_API_COMPANY` - Company name for authentication
- `NEXT_PUBLIC_API_USERNAME` - Username for authentication
- `NEXT_PUBLIC_API_PASSWORD` - Password for authentication (consider server-side only)

**Note**: For production, consider moving sensitive credentials to server-side only.

## Dependencies

Required dependencies:
- `@tanstack/react-query` - API calls and server state
- `@tanstack/react-form` - Form validation and management
- `zustand` - State management
- `zod` - Validation schemas
- HTTP client (native `fetch` or `axios`)

## File Naming Conventions

- **Components**: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- **Utilities**: `camelCase.ts` (e.g., `formatDate.ts`)
- **Stores**: `kebab-case-store.ts` (e.g., `auth-store.ts`)
- **Services**: `kebab-case-service.ts` (e.g., `user-service.ts`)
- **Types**: `kebab-case.types.ts` (e.g., `api.types.ts`)
- **Hooks**: `use-kebab-case.ts` (e.g., `use-auth.ts`)
- **Validations**: `kebab-case.validation.ts` (e.g., `login.validation.ts`)

## Import Conventions

- Use **absolute imports** with `@/` prefix (configured in tsconfig.json)
- Group imports: external packages → internal modules → relative imports
- Use **barrel exports** for cleaner imports: `import { UserService } from '@/lib/services'`

## Best Practices

1. **Never** make direct API calls from components
2. **Always** use TypeScript types (no `any`)
3. **Always** handle loading and error states
4. **Always** validate forms with Zod
5. **Always** use shadcn/ui components (don't create custom unless needed)
6. **Always** use TanStack Query for server state
7. **Always** use Zustand for global client state
8. **Always** follow the folder structure
9. **Always** add types for API responses
10. **Always** use environment variables for configuration
11. **Always** use route groups for organizing protected/public routes
12. **Always** keep components small and focused
13. **Always** handle errors gracefully with user-friendly messages
14. **Always** use proper TypeScript types (no `any`, prefer `unknown` if needed)
15. **Always** separate business logic from UI components

## Code Examples

### API Call Pattern
```typescript
// ❌ BAD - Direct API call in component
const MyComponent = () => {
  const [data, setData] = useState();
  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setData);
  }, []);
};

// ✅ GOOD - Through service layer with TanStack Query
const MyComponent = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getUsers(),
  });
};
```

### Form Pattern
```typescript
// ✅ GOOD - TanStack Form with Zod validation
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginForm = () => {
  const form = useForm({
    validatorAdapter: zodValidator(),
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      await authService.login(value);
    },
  });
  // ... form JSX
};
```

### State Management Pattern
```typescript
// ✅ GOOD - Zustand store
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: async (credentials) => {
        // ... login logic
      },
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
);
```

## ERP-Specific Considerations

- **OData V4** format for API responses
- **Company-based** authentication (username/password/company)
- **Form-based** UI - each ERP form will have its own API endpoint
- **User access control** - sidebar items based on user permissions
- **No JWT** - Basic Auth for all API calls
- API base URL: `https://api.sampoornafeeds.in:7048/BC230/ODataV4`

## Testing Considerations

- Write tests for services (business logic)
- Write tests for data transformation functions
- Write tests for validation schemas
- Test error handling paths
- Use proper mocking for API calls

## Performance Considerations

- Use **React Server Components** when possible
- Implement **proper caching** with TanStack Query
- Use **code splitting** for large features
- **Optimize images** and assets
- **Lazy load** components when appropriate

