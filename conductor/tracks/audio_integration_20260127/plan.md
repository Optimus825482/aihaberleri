# Implementation Plan - Audio Suite Integration

## Phase 1: Foundation & Audio Service Setup
- [x] Task: Create Audio Context and Provider 85ee41c
    - [x] Write Tests: Audio provider state management tests
    - [x] Implement: `AudioProvider` component and `useAudio` hook
- [x] Task: Audio Service Layer 3335333
    - [x] Write Tests: Web Speech API wrapper tests
    - [x] Implement: `AudioService` for handling TTS logic, voice selection, and speed
- [~] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Core Player UI & Controls
- [ ] Task: Base Audio Player Component
    - [ ] Write Tests: Player UI components tests
    - [ ] Implement: `AudioPlayer` component with Play/Pause, Stop buttons using Shadcn UI
- [ ] Task: Settings Controls (Speed & Voice)
    - [ ] Write Tests: Speed and voice selection logic tests
    - [ ] Implement: Select menus for speed (0.75x - 2.0x) and voice (Male/Female)
- [ ] Task: Integration with Article Pages
    - [ ] Write Tests: Check if player renders on article pages
    - [ ] Implement: Add `AudioPlayer` to `src/app/news/[slug]/page.tsx`
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Text Highlighting & Advanced Interactions
- [ ] Task: Text Highlighting Logic
    - [ ] Write Tests: Highlighting logic with mock utterances
    - [ ] Implement: Link Audio Service events to article text for visual highlighting
- [ ] Task: Sticky Mini-Player
    - [ ] Write Tests: Scroll visibility tests for mini-player
    - [ ] Implement: Intersection Observer based mini-player that appears when main player is out of view
- [ ] Task: Keyboard Shortcuts & Accessibility
    - [ ] Write Tests: Keyboard event handling tests
    - [ ] Implement: Space for play/pause, M for mute, ARIA labels
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Optimization & Persistence
- [ ] Task: Progress Persistence
    - [ ] Write Tests: LocalStorage sync tests
    - [ ] Implement: Save playback position and settings to LocalStorage
- [ ] Task: Mobile Optimization & Final Polish
    - [ ] Write Tests: Mobile layout responsiveness tests
    - [ ] Implement: Responsive design adjustments for small screens
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
