# Technical Guidelines

This document defines development standards for consistent, secure, and maintainable code in the Handy project.

---

## 1. Naming Conventions

### 1.1 Files and Folders

**Frontend (TypeScript/React):**

- Use kebab-case for all file and folder names
- Components: `my-component.tsx`
- Hooks: `use-my-hook.ts`
- Helpers: `my-component.helpers.ts`
- Types: `types.ts` or `my-feature.types.ts`

**Backend (Rust):**

- Use snake_case for file and folder names
- Modules: `audio_toolkit.rs`, `model_manager.rs`
- Follow Rust standard naming conventions

### 1.2 Component and Hook Naming

- Components: PascalCase (`UserProfile`, `SettingsPage`)
- Hooks: camelCase with `use` prefix (`useAuth`, `useModelDownload`)
- Functions: camelCase (`formatDate`, `calculateTotal`)
- Constants: UPPER_SNAKE_CASE (`MAX_ITEMS`, `API_URL`)

### 1.3 Interfaces and Types

- Use PascalCase for interfaces and types
- Do NOT prefix with `I` (use `User`, not `IUser`)
- Prefer `interface` for object shapes
- Use `type` for unions, tuples, or complex types

```typescript
interface UserSettings {
  language: string;
  theme: "light" | "dark";
  shortcut: string;
}

type TranscriptionStatus = "idle" | "recording" | "processing" | "complete";
```

---

## 2. Project Structure

### 2.1 Frontend (`src/`)

```
src/
├── components/           # Shared UI components
│   ├── settings/        # Settings-related components
│   └── model-selector/  # Model management UI
│
├── hooks/               # Reusable React hooks
│   ├── use-settings.ts
│   └── use-model.ts
│
├── lib/                 # Utilities and services
│   └── types.ts         # Shared TypeScript types
│
└── App.tsx              # Main application component
```

### 2.2 Backend (`src-tauri/src/`)

```
src-tauri/src/
├── lib.rs               # Main entry point
├── managers/            # Core business logic
│   ├── audio.rs         # Audio recording management
│   ├── model.rs         # Model downloading/management
│   └── transcription.rs # Speech-to-text pipeline
│
├── audio_toolkit/       # Low-level audio processing
│   ├── audio/           # Device, recording, resampling
│   └── vad/             # Voice Activity Detection
│
├── commands/            # Tauri IPC command handlers
├── shortcut.rs          # Global shortcut handling
└── settings.rs          # Settings management
```

### 2.3 Import Conventions

Import directly from source files (avoid barrel files):

```typescript
import { Button } from "@/components/button";
import { useSettings } from "@/hooks/use-settings";

import { Button } from "@/components";
```

---

## 3. React Best Practices

### 3.1 Component Definition

Use function components with explicit prop types:

```tsx
interface TranscriptionDisplayProps {
  text: string;
  isLoading: boolean;
  onRetry?: () => void;
}

const TranscriptionDisplay = ({
  text,
  isLoading,
  onRetry,
}: TranscriptionDisplayProps) => {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="transcription-container">
      <p>{text}</p>
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  );
};
```

### 3.2 Styling

- Use **Tailwind CSS** for styling
- Keep utility classes readable (break long chains)
- Use semantic class names for complex components

### 3.3 State Management

- **Local state**: `useState`, `useReducer`
- **Global state**: Zustand (already in use)
- **Server state**: Tauri commands + events

### 3.4 Tauri Integration

```typescript
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const startRecording = async () => {
  await invoke("start_recording");
};

useEffect(() => {
  const unlisten = listen("transcription_complete", (event) => {
    setTranscription(event.payload as string);
  });

  return () => {
    unlisten.then((fn) => fn());
  };
}, []);
```

---

## 4. Rust Best Practices

### 4.1 Error Handling

Use explicit error handling; avoid `unwrap()` in production code:

```rust
fn get_audio_device(name: &str) -> Result<Device, AudioError> {
    devices()
        .find(|d| d.name().ok() == Some(name.to_string()))
        .ok_or(AudioError::DeviceNotFound(name.to_string()))
}

fn process_audio() -> Result<(), Box<dyn Error>> {
    let device = get_audio_device("default")?;
    Ok(())
}
```

### 4.2 Tauri Commands

Keep commands thin; delegate to managers:

```rust
#[tauri::command]
pub async fn start_recording(
    audio_manager: State<'_, AudioManager>,
) -> Result<(), String> {
    audio_manager
        .start()
        .await
        .map_err(|e| e.to_string())
}
```

### 4.3 Async Patterns

Use Tokio for async operations:

```rust
use tokio::sync::Mutex;

pub struct TranscriptionManager {
    state: Mutex<TranscriptionState>,
}

impl TranscriptionManager {
    pub async fn process(&self, audio: AudioData) -> Result<String, Error> {
        let mut state = self.state.lock().await;
        // Processing logic
    }
}
```

### 4.4 Documentation

Add doc comments for public APIs:

````rust
/// Manages audio recording from input devices.
///
/// # Example
/// ```
/// let manager = AudioManager::new(config)?;
/// manager.start_recording().await?;
/// ```
pub struct AudioManager {
    // ...
}
````

---

## 5. TypeScript Usage

### 5.1 Strict Types

The use of `any` is **strictly forbidden**. Use `unknown` with type guards:

```typescript
const data: any = fetchData();

const data: unknown = fetchData();
if (isAudioConfig(data)) {
  processConfig(data);
}
```

### 5.2 Explicit Conditions

Be explicit about conditions:

```typescript
if (items.length > 0) {
  /* ... */
}
if (user != null) {
  /* ... */
}

if (items.length) {
  /* ... */
}
if (user) {
  /* ... */
}
```

### 5.3 Zod for Validation

Use Zod schemas for runtime validation (already in project):

```typescript
import { z } from "zod";

const SettingsSchema = z.object({
  language: z.string(),
  shortcut: z.string(),
  audioDevice: z.string().optional(),
});

type Settings = z.infer<typeof SettingsSchema>;
```

---

## 6. Code Quality

### 6.1 Linting & Formatting

**Frontend:**

- ESLint for TypeScript/JavaScript
- Prettier for formatting
- Run before committing: `bun run lint` and `bun run format:check`

**Backend:**

- `cargo fmt` for formatting
- `cargo clippy` for linting
- Run: `cd src-tauri && cargo fmt && cargo clippy`

### 6.2 Pre-commit Checklist

```bash
bun run lint
bun run format:check
cd src-tauri && cargo fmt -- --check
cd src-tauri && cargo clippy -- -D warnings
```

### 6.3 Commit Messages

Use conventional commits:

- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `refactor:` code refactoring
- `test:` test additions/changes
- `chore:` maintenance tasks

---

## 7. Security Guidelines

### 7.1 Privacy First

- Never transmit audio/transcriptions externally without explicit consent
- All processing should default to local/offline
- Settings and data stay on user's machine

### 7.2 No Secrets in Code

- Never hardcode API keys or secrets
- Use environment variables for sensitive config
- Never log sensitive information

### 7.3 Permissions

- Request only necessary system permissions
- Explain why permissions are needed
- Handle permission denials gracefully

---

## 8. Testing

### 8.1 Manual Testing Workflow

1. Run dev mode: `bun run tauri dev`
2. Test audio recording with different devices
3. Test transcription with various audio qualities
4. Test keyboard shortcuts
5. Enable debug mode (`Cmd/Ctrl+Shift+D`) for diagnostics

### 8.2 Production Build Testing

```bash
bun run tauri build
```

Test the production build before submitting PRs.

---

## 9. Performance Guidelines

### 9.1 Frontend

- Memoize expensive computations with `useMemo`
- Prevent unnecessary re-renders with `React.memo`
- Use proper cleanup in `useEffect`

### 9.2 Backend

- Use async for I/O operations
- Pool resources (audio streams, model instances)
- Profile memory usage for model loading

---

## 10. Platform-Specific Notes

### macOS

- Metal acceleration for Whisper
- Accessibility permissions for global shortcuts
- Hardened runtime for distribution

### Windows

- Vulkan acceleration
- Code signing for distribution
- Handle UAC considerations

### Linux

- OpenBLAS + Vulkan acceleration
- AppImage for distribution
- Test on multiple desktop environments
