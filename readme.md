# Business Central - TS

A modern TypeScript library built for Node.js 24+, Bun, and Deno with Zod integration.

## Features

- 🚀 **Modern TypeScript**: Uses latest TypeScript features targeting Node.js 24+
- 🔄 **Universal Runtime**: Works on Node.js, Bun, and Deno using native `fetch`
- ✅ **Runtime Validation**: Powered by Zod for schema validation
- 🛡️ **Type Safety**: Full TypeScript support with strict type checking
- 🔧 **Error Handling**: Comprehensive error handling with proper error chaining
- 🧪 **Native Testing**: Uses Node.js built-in test runner
- 📦 **ESM Only**: Modern ES modules with proper exports

## Installation

```bash
npm install bc-ts
# Peer dependency
npm install zod@^4.0.0
```

## Usage

```typescript
import { ApiClient, ConfigSchema } from 'your-library-name';
import * as z from 'zod';

// Create and validate configuration
const config = {
  baseUrl: 'https://api.example.com',
  timeout: 5000,
  retries: 2,
};

const client = new ApiClient(config);

// Make requests with proper error handling
const result = await client.get<{ message: string }>('/hello');

if (result.success) {
  console.log(result.data.message);
} else {
  console.error('Request failed:', result.error.message);
  console.error('Error code:', result.error.code);
}
```

## API Reference

### `ApiClient`

Main client class for making HTTP requests.

#### Constructor

```typescript
new ApiClient(config: Partial<Config>)
```

#### Methods

- `get<T>(endpoint: string): Promise<Result<T>>` - GET request
- `post<T>(endpoint: string, data: unknown): Promise<Result<T>>` - POST request
- `request<T>(endpoint: string, options?: RequestInit): Promise<Result<T>>` - Custom request

### Error Handling

The library uses a `Result<T, E>` pattern for consistent error handling:

```typescript
type Result<T, E = LibraryError> =
  | { success: true; data: T }
  | { success: false; error: E };
```

All errors are wrapped in `LibraryError` which includes:
- `message`: Human-readable error description
- `code`: Machine-readable error code
- `cause`: Original error that caused this error (for error chaining)

## Development

### Scripts

```bash
# Build the library
npm run build

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Development with hot reload
npm run dev

# Lint code
npm run lint
npm run lint:fix

# Type check without emitting
npm run type-check
```

### Requirements

- Node.js 24+ (for development and runtime)
- TypeScript 5.6+
- Zod 4.x (peer dependency)

### Architecture Decisions

#### Error Handling Strategy

The library implements a comprehensive error handling strategy:

1. **Custom Error Classes**: `LibraryError` extends the native `Error` class with additional context (`code`, `cause`)
2. **Error Chaining**: Original errors are preserved in the `cause` property for full traceability
3. **Result Pattern**: Uses discriminated unions (`Result<T, E>`) to force explicit error handling
4. **Retry Logic**: Implements exponential backoff with configurable retry limits
5. **Error Classification**: Different error codes help identify the error source and appropriate handling

#### Runtime Validation

Uses Zod for runtime validation because:

1. **Type Safety**: Ensures runtime data matches TypeScript types
2. **Clear Error Messages**: Provides detailed validation error messages
3. **Schema Evolution**: Easy to extend and modify validation rules
4. **Documentation**: Schemas serve as living documentation

#### Universal Runtime Support

The library uses native `fetch` which is available in:
- Node.js 18+ (experimental) and 21+ (stable)
- Bun (native support)
- Deno (native support)

This eliminates the need for polyfills while maintaining broad compatibility.

## License

MIT
