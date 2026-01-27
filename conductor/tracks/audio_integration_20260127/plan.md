# Implementation Plan - Audio Suite Integration

## Phase 1: Foundation & Audio Service Setup [checkpoint: afa64e8]
- [x] Task: Create Audio Context and Provider 85ee41c
    - [x] Write Tests: Audio provider state management tests
    - [x] Implement: `AudioProvider` component and `useAudio` hook
- [x] Task: Audio Service Layer 3335333
    - [x] Write Tests: Web Speech API wrapper tests
    - [x] Implement: `AudioService` for handling TTS logic, voice selection, and speed
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md) afa64e8

## Phase 2: Core Player UI & Controls [checkpoint: aaeb22b]
- [x] Task: Base Audio Player Component aaeb22b
    - [x] Write Tests: Player UI components tests
    - [x] Implement: `AudioPlayer` component with Play/Pause, Stop buttons using Shadcn UI
- [x] Task: Settings Controls (Speed & Voice) aaeb22b
    - [x] Write Tests: Speed and voice selection logic tests
    - [x] Implement: Select menus for speed (0.75x - 2.0x) and voice (Male/Female)
- [x] Task: Integration with Article Pages aaeb22b
    - [x] Write Tests: Check if player renders on article pages
    - [x] Implement: Add `AudioPlayer` to `src/app/news/[slug]/page.tsx`
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md) aaeb22b

## Phase 3: Text Highlighting & Advanced Interactions [checkpoint: 94fd13f]
- [x] Task: Text Highlighting Logic 19efe44
    - [x] Write Tests: Highlighting logic with mock utterances
    - [x] Implement: Link Audio Service events to article text for visual highlighting
- [x] Task: Sticky Mini-Player 51d6acd
    - [x] Write Tests: Scroll visibility tests for mini-player
    - [x] Implement: Intersection Observer based mini-player that appears when main player is out of view
- [x] Task: Keyboard Shortcuts & Accessibility 51d6acd
    - [x] Write Tests: Keyboard event handling tests
    - [x] Implement: Space for play/pause, M for mute, ARIA labels
- [x] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md) 94fd13f

## Phase 4: Optimization & Persistence
- [~] Task: Progress Persistence
    - [ ] Write Tests: LocalStorage sync tests
    - [ ] Implement: Save playback position and settings to LocalStorage
- [ ] Task: Mobile Optimization & Final Polish
    - [ ] Write Tests: Mobile layout responsiveness tests
    - [ ] Implement: Responsive design adjustments for small screens
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
