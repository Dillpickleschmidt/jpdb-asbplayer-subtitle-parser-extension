# Subtitle Extraction Explanation

```
src/
├── components/
│   └── SubtitleResizer.tsx      # Main UI component
└── services/
    ├── frame-handlers.ts        # Iframe communication
    ├── subtitle-observer.ts     # DOM observation
    └── subtitle-manager.ts      # System coordination
```

### Frame Communication & Subtitle Management

#### Parent-Child Frame Architecture

1. **Role Detection**

   - Extension first checks `window.self === window.top`
   - If true: acts as parent document
   - If false: acts as child (iframe) document

2. **Frame Registration Process**

   ```
   Parent Window                  Iframe
   ┌──────────────┐              ┌──────────────┐
   │FrameInfoListener│  ◄────────  │FrameInfoBroadcaster│
   └──────────────┘   message    └──────────────┘
   ```

   - Iframes generate unique IDs using `Math.random()`
   - They broadcast these IDs to parent via postMessage
   - Parent maintains a registry of frame IDs and references

3. **Cross-Frame Subtitle Detection**
   ```
   Parent Window
   ├── Main Document Subtitles
   ├── Shadow DOM Subtitles
   └── Iframe Registry
       ├── Iframe 1 Subtitles
       ├── Iframe 2 Subtitles
       └── ...
   ```

#### Subtitle Detection Flow

1. **Initialization**
   - Extension loads and mounts the SubtitleResizer component
   - Determines if it's in a parent document or iframe
   - Sets up appropriate frame handlers
2. **Frame Communication**

   - Parent documents initialize `FrameInfoListener`
   - Iframes initialize `FrameInfoBroadcaster`
   - Each iframe sends registration message
   - Parent builds and maintains iframe registry

3. **Content Access Strategy**

   ```typescript
   // Parent accessing iframe content
   Object.values(frameInfoListener.iframesById).forEach((iframe) => {
     try {
       const iframeDoc = iframe.contentDocument
       // Query for subtitles in iframeDoc
     } catch (e) {
       // Handle cross-origin gracefully
     }
   })
   ```

4. **Unified Management**

   - SubtitleManager coordinates access across contexts
   - Maintains single source of truth for subtitle state
   - Handles cleanup and reinitialization when frames change
   - `SubtitleObserver` watches for changes in:
     - Main document
     - Shadow DOM
     - Registered iframes
   - Uses MutationObserver for efficient change detection
   - Triggers callback when subtitles are found

5. **Subtitle Management**

   - `SubtitleManager` coordinates the system:
     - Initializes frame handlers
     - Sets up observers
     - Manages component lifecycle
   - Provides clean interface for subtitle updates

6. **User Interface**
   - Shows current font size
   - Provides size adjustment controls
   - Displays subtitle count
   - Updates subtitle sizes in real-time

### Key Components

#### Frame Handlers

- `FrameInfoListener`: Handles parent frame communication
- `FrameInfoBroadcaster`: Handles iframe communication
- Uses postMessage for cross-frame communication

#### Subtitle Observer

- Watches for DOM changes
- Detects subtitles across different contexts
- Efficiently processes mutations
- Handles initial subtitle detection

#### Subtitle Manager

- Coordinates system components
- Manages frame handlers
- Controls observer lifecycle
- Provides unified update interface

## Usage

```typescript
import { render } from 'solid-js/web'
import { SubtitleResizer } from './components/SubtitleResizer'

const root = document.createElement('div')
document.body.appendChild(root)
render(() => <SubtitleResizer />, root)
```

## Technical Notes

### Cross-Origin Considerations

1. **Same-Origin Iframes**

   - Full access to iframe content via contentDocument
   - Direct subtitle manipulation possible
   - Full MutationObserver functionality

2. **Cross-Origin Iframes**

   - Limited access to iframe content
   - Graceful error handling when access is restricted
   - Maintains stability even when some frames are inaccessible

3. **Security Boundaries**
   ```typescript
   try {
     // This works for same-origin frames
     const iframeDoc = iframe.contentDocument
   } catch (e) {
     // Silently handle cross-origin restrictions
   }
   ```

### Performance Features

- Uses MutationObserver for efficient DOM monitoring
- Handles cross-origin iframes gracefully
- Maintains performance through targeted observation
- Logs subtitle text for debugging purposes
- Cleanly handles component lifecycle and cleanup

## Browser Support

- Chrome/Chromium-based browsers
- Requires Manifest V3 support
- Handles both same-origin and cross-origin iframes
