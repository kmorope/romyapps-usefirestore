# @romyapps/usefirestore

> Headless Firestore hooks powered by TanStack Query for React 18/19. Fully configurable with built-in caching, logging, and debugging.

[![npm version](https://badge.fury.io/js/@romyapps%2Fusefirestore.svg)](https://www.npmjs.com/package/@romyapps/usefirestore)
[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://kmorope.github.io/romyapps-usefirestore/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

📚 **[View Full Documentation](https://kmorope.github.io/romyapps-usefirestore/)** | 📦 **[npm](https://www.npmjs.com/package/@romyapps/usefirestore)** | 🐛 **[Issues](https://github.com/kmorope/romyapps-usefirestore/issues)**

## Features

- 🔥 **Type-safe Firestore hooks** - Full TypeScript support
- ⚡ **TanStack Query integration** - Automatic caching, refetching, and state management
- 🎯 **Flexible caching strategies** - cache-first, cache-only, server-only, or default
- 📊 **Read statistics tracking** - Monitor Firestore document reads
- 📝 **Optional audit logging** - Track all CREATE, UPDATE, and DELETE operations
- 🐛 **Debug mode** - Built-in logging for development
- 🎨 **Headless** - No UI, just hooks
- 🔧 **Fully configurable** - Custom error handlers, loggers, and storage

## Installation

```bash
npm install @romyapps/usefirestore
# or
yarn add @romyapps/usefirestore
# or
pnpm add @romyapps/usefirestore
# or
bun add @romyapps/usefirestore
```

### Peer Dependencies

```bash
npm install firebase @tanstack/react-query react
```

## Quick Start

### 1. Setup Firebase Context

Wrap your app with `FirebaseConfigProvider`:

```tsx
import { FirebaseConfigProvider } from "@romyapps/usefirestore";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  // ... other config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FirebaseConfigProvider
        config={{
          db,
          logger: console, // optional
          onError: (error, context) => {
            console.error(`Error in ${context}:`, error);
          },
          keyPrefix: "myapp", // optional, default: 'rf'
        }}
      >
        <YourApp />
      </FirebaseConfigProvider>
    </QueryClientProvider>
  );
}
```

### 2. Use Hooks in Components

```tsx
import {
  useCollection,
  useDocument,
  useAddDocument,
} from "@romyapps/usefirestore";

function UsersList() {
  // Fetch a collection
  const { data: users, isLoading } = useCollection("users");

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul>
      {users?.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## API Reference

### Hooks

#### `useCollection<T>(collectionName, options?, behavior?)`

Fetch a collection of documents with optional filtering, sorting, and pagination.

**Parameters:**

- `collectionName` (string) - Firestore collection name
- `options` (CollectionOptions) - Query options (where, orderBy, limit, cursor)
- `behavior` (QueryBehavior & UseQueryOptions) - Cache behavior and React Query options

**Returns:** TanStack Query result with `data: Array<WithId<T>>`

**Example:**

```tsx
type User = {
  name: string;
  email: string;
  age: number;
  createdAt: Date;
};

function ActiveUsers() {
  const {
    data: users,
    isLoading,
    error,
  } = useCollection<User>(
    "users",
    {
      where: [
        { field: "status", operator: "==", value: "active" },
        { field: "age", operator: ">=", value: 18 },
      ],
      orderBy: [{ field: "createdAt", direction: "desc" }],
      limit: 10,
    },
    {
      preferCache: "cache-first", // Try cache first, fallback to server
      debug: true, // Enable console logging
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {users?.map((user) => (
        <div key={user.id}>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
        </div>
      ))}
    </div>
  );
}
```

**With Metadata (Pagination):**

```tsx
function PaginatedUsers() {
  const [cursor, setCursor] = useState(null);

  const { data } = useCollection<User>(
    "users",
    {
      orderBy: [{ field: "createdAt", direction: "desc" }],
      limit: 10,
      cursor: cursor ? { type: "after", doc: cursor } : undefined,
    },
    {
      withMeta: true, // Returns { items, firstDoc, lastDoc, size, empty }
    }
  );

  const handleNextPage = () => {
    if (data?.lastDoc) {
      setCursor(data.lastDoc);
    }
  };

  return (
    <div>
      {data?.items.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
      <button onClick={handleNextPage} disabled={data?.empty}>
        Next Page
      </button>
    </div>
  );
}
```

#### `useDocument<T>(collectionName, documentId?, behavior?)`

Fetch a single document by ID.

**Parameters:**

- `collectionName` (string) - Firestore collection name
- `documentId` (string | null) - Document ID (if null, query is disabled)
- `behavior` (QueryBehavior & UseQueryOptions) - Cache behavior and React Query options

**Returns:** TanStack Query result with `data: WithId<T> | null`

**Example:**

```tsx
function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading } = useDocument<User>("users", userId);

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

// Conditional fetching
function ConditionalProfile({ userId }: { userId: string | null }) {
  const { data } = useDocument<User>("users", userId, {
    preferCache: "server-only", // Always fetch from server
  });

  return data ? <div>{data.name}</div> : null;
}
```

#### `useAddDocument<T>(collectionName, options?)`

Create a new document in a collection.

**Parameters:**

- `collectionName` (string) - Firestore collection name
- `options` - Configuration object:
  - `invalidate` (boolean) - Invalidate queries after add (default: true)
  - `enableLogging` (boolean) - Enable audit logging (default: false)
  - `debug` (boolean) - Enable debug logging (default: false)
  - `beforeSave` (function) - Transform data before saving

**Returns:** TanStack Query mutation result

**Example:**

```tsx
function CreateUserForm() {
  const addUser = useAddDocument<User>("users", {
    invalidate: true,
    enableLogging: true,
    debug: true,
    beforeSave: (data) => ({
      ...data,
      name: data.name.trim(),
      email: data.email.toLowerCase(),
    }),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    try {
      const newUser = await addUser.mutateAsync({
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        age: Number(formData.get("age")),
      });

      console.log("Created user with ID:", newUser.id);
    } catch (error) {
      console.error("Failed to create user:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <input name="age" type="number" placeholder="Age" required />
      <button type="submit" disabled={addUser.isPending}>
        {addUser.isPending ? "Creating..." : "Create User"}
      </button>
      {addUser.isError && <p>Error: {addUser.error.message}</p>}
      {addUser.isSuccess && <p>User created successfully!</p>}
    </form>
  );
}
```

#### `useUpdateDocument<T>(collectionName, options?)`

Update an existing document.

**Parameters:**

- `collectionName` (string) - Firestore collection name
- `options` - Configuration object:
  - `enableLogging` (boolean) - Enable audit logging with previous data
  - `debug` (boolean) - Enable debug logging
  - `beforeSave` (function) - Transform data before updating

**Returns:** TanStack Query mutation result

**Example:**

```tsx
function EditUserForm({ user }: { user: WithId<User> }) {
  const updateUser = useUpdateDocument<WithId<User>>("users", {
    enableLogging: true,
    beforeSave: (data) => ({
      ...data,
      name: data.name?.trim(),
    }),
  });

  const handleUpdate = async () => {
    await updateUser.mutateAsync({
      id: user.id,
      name: "New Name",
      email: "newemail@example.com",
    });
  };

  return (
    <button onClick={handleUpdate} disabled={updateUser.isPending}>
      {updateUser.isPending ? "Updating..." : "Update User"}
    </button>
  );
}
```

#### `useDeleteDocument(collectionName, options?)`

Delete a document by ID.

**Parameters:**

- `collectionName` (string) - Firestore collection name
- `options` - Configuration object:
  - `enableLogging` (boolean) - Log deletion with deleted data
  - `debug` (boolean) - Enable debug logging

**Returns:** TanStack Query mutation result

**Example:**

```tsx
function DeleteUserButton({ userId }: { userId: string }) {
  const deleteUser = useDeleteDocument("users", {
    enableLogging: true,
    debug: true,
  });

  const handleDelete = async () => {
    if (confirm("Are you sure?")) {
      await deleteUser.mutateAsync(userId);
    }
  };

  return (
    <button onClick={handleDelete} disabled={deleteUser.isPending}>
      {deleteUser.isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
```

#### `useCollectionFilters<T>(initial?)`

Helper hook for managing dynamic collection filters.

**Example:**

```tsx
function FilterableUsersList() {
  const { filters, addFilter, removeFilter, clearFilters } =
    useCollectionFilters<User>([
      { field: "status", operator: "==", value: "active" },
    ]);

  const { data: users } = useCollection<User>("users", {
    where: filters,
  });

  return (
    <div>
      <button
        onClick={() =>
          addFilter({
            field: "age",
            operator: ">=",
            value: 18,
          })
        }
      >
        Add Age Filter
      </button>
      <button onClick={clearFilters}>Clear All</button>

      <div>Active Filters: {filters.length}</div>

      {users?.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

### Statistics Functions

Track and analyze Firestore read operations.

```tsx
import {
  getCollectionStats,
  clearCollectionStats,
  clearAllCollectionStats,
} from "@romyapps/usefirestore";

// Get stats for a collection
const stats = getCollectionStats("users");
console.log(`Read count: ${stats.readCount}`);
console.log(`Last fetched: ${stats.lastFetched}`);

// Clear stats for a collection
clearCollectionStats("users");

// Clear all stats
clearAllCollectionStats();
```

## Advanced Configuration

### Custom Logger

```tsx
import pino from "pino";

const logger = pino();

<FirebaseConfigProvider
  config={{
    db,
    logger: {
      debug: logger.debug.bind(logger),
      info: logger.info.bind(logger),
      warn: logger.warn.bind(logger),
      error: logger.error.bind(logger),
    },
  }}
>
  {children}
</FirebaseConfigProvider>;
```

### Audit Logging

Enable automatic logging of all data mutations:

```tsx
<FirebaseConfigProvider
  config={{
    db,
    getUserId: () => auth.currentUser?.uid || null,
    logging: {
      enabled: true,
      resolveLogCollection: (collectionName) => `${collectionName}_audit`,
      includePreviousData: true, // Include old values in update logs
    },
  }}
>
  {children}
</FirebaseConfigProvider>
```

Log documents will include:

- `originalDocId` - ID of the modified document
- `action` - CREATE, UPDATE, or DELETE
- `modifiedBy` - User ID from `getUserId()`
- `modifiedOn` - Timestamp of the operation
- `previousData` - Previous document data (UPDATE only)
- `deletedData` - Deleted document data (DELETE only)

### Custom Storage

Use a custom storage backend for statistics:

```tsx
import AsyncStorage from "@react-native-async-storage/async-storage";

// Create a Storage-like adapter
const asyncStorageAdapter = {
  length: 0,
  key: (index: number) => null,
  getItem: async (key: string) => await AsyncStorage.getItem(key),
  setItem: async (key: string, value: string) =>
    await AsyncStorage.setItem(key, value),
  removeItem: async (key: string) => await AsyncStorage.removeItem(key),
};

<FirebaseConfigProvider
  config={{
    db,
    storage: asyncStorageAdapter,
  }}
>
  {children}
</FirebaseConfigProvider>;
```

### Default Query Options

Set default TanStack Query options for all hooks:

```tsx
<FirebaseConfigProvider
  config={{
    db,
    defaultQueryOptions: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: true,
      retry: 3,
    },
  }}
>
  {children}
</FirebaseConfigProvider>
```

## Cache Strategies

Control how data is fetched with `preferCache`:

- **`default`** - Let Firebase SDK decide (tries cache + server)
- **`cache-first`** - Try cache first, fallback to server if empty
- **`cache-only`** - Only use cache, fail if not available
- **`server-only`** - Always fetch from server, bypass cache

```tsx
// Always get fresh data
const { data } = useCollection("users", undefined, {
  preferCache: "server-only",
});

// Offline-first approach
const { data } = useCollection("users", undefined, {
  preferCache: "cache-first",
});
```

## TypeScript Support

Full type safety with generics:

```tsx
interface Post {
  title: string;
  content: string;
  authorId: string;
  publishedAt: Date;
  tags: string[];
}

// Type-safe collection
const { data: posts } = useCollection<Post>("posts");
// data is Array<Post & { id: string }>

// Type-safe document
const { data: post } = useDocument<Post>("posts", postId);
// data is (Post & { id: string }) | null

// Type-safe mutations
const addPost = useAddDocument<Post>("posts");
const updatePost = useUpdateDocument<Post & { id: string }>("posts");
```

## Examples

### Complete CRUD Example

```tsx
import {
  useCollection,
  useDocument,
  useAddDocument,
  useUpdateDocument,
  useDeleteDocument,
} from "@romyapps/usefirestore";

interface Todo {
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
}

function TodoApp() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Read operations
  const { data: todos, isLoading } = useCollection<Todo>("todos", {
    orderBy: [{ field: "priority", direction: "desc" }],
  });

  const { data: selectedTodo } = useDocument<Todo>("todos", selectedId);

  // Write operations
  const addTodo = useAddDocument<Todo>("todos");
  const updateTodo = useUpdateDocument<Todo & { id: string }>("todos");
  const deleteTodo = useDeleteDocument("todos");

  const handleAdd = async (title: string) => {
    await addTodo.mutateAsync({
      title,
      completed: false,
      priority: "medium",
    });
  };

  const handleToggle = async (todo: Todo & { id: string }) => {
    await updateTodo.mutateAsync({
      id: todo.id,
      completed: !todo.completed,
    });
  };

  const handleDelete = async (id: string) => {
    await deleteTodo.mutateAsync(id);
  };

  if (isLoading) return <div>Loading todos...</div>;

  return (
    <div>
      <button onClick={() => handleAdd("New Todo")}>Add Todo</button>

      <ul>
        {todos?.map((todo) => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggle(todo)}
            />
            <span>{todo.title}</span>
            <button onClick={() => handleDelete(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>

      {selectedTodo && (
        <div>
          <h3>Selected: {selectedTodo.title}</h3>
          <p>Priority: {selectedTodo.priority}</p>
        </div>
      )}
    </div>
  );
}
```

### Real-time Polling

```tsx
function RealtimeUsers() {
  const { data: users } = useCollection<User>("users", undefined, {
    refetchInterval: 5000, // Poll every 5 seconds
    preferCache: "server-only", // Always fetch fresh data
  });

  return (
    <div>
      <h2>Active Users: {users?.length}</h2>
      {users?.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

## Publishing

This package uses GitHub Actions to automatically publish to npm.

### Setup

1. **Create an NPM Access Token**

   - Go to [npmjs.com](https://www.npmjs.com/) and log in
   - Click your profile → "Access Tokens" → "Generate New Token"
   - Choose "Automation" type
   - Copy the token

2. **Add NPM Token to GitHub**
   - Go to your repository on GitHub
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your npm token
   - Click "Add secret"

### Publishing Methods

#### Method 1: Create a GitHub Release (Recommended)

1. Go to your repository → Releases → "Create a new release"
2. Choose or create a tag (e.g., `v1.0.0`)
3. Add release notes
4. Click "Publish release"
5. The workflow will automatically run and publish to npm

#### Method 2: Manual Trigger

1. Go to Actions → "Publish to NPM" → "Run workflow"
2. Optionally specify a version (e.g., `1.0.1`, `patch`, `minor`, `major`)
3. Click "Run workflow"
4. The package will be published with the specified version

### Development Workflow

```bash
# 1. Make your changes
git add .
git commit -m "feat: add new feature"

# 2. Update version in package.json
npm version patch  # or minor, or major

# 3. Push changes and tags
git push && git push --tags

# 4. Create a release on GitHub (triggers publish)
```

### CI/CD

The repository includes two workflows:

- **CI** (`ci.yml`) - Runs on every push/PR to validate the build
- **Publish** (`publish.yml`) - Publishes to npm on releases or manual trigger

## License

MIT © Camilo Romero

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For issues and questions, please open an issue on GitHub.
