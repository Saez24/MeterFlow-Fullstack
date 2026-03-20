# MeterFlow Application Blueprint

## 1. Overview

This document tracks the refactoring of the MeterFlow application to align with the principles outlined in `GEMINI.md`. The goal is to create a high-performance, accessible, and visually stunning application using Zoneless Angular, Signals, and an Apple-inspired design aesthetic.

**Technology Stack:**
- **Framework:** Angular (Zoneless, Standalone Components)
- **State Management:** Angular Signals
- **Styling:** SCSS with Apple Design Principles
- **UI:** Angular Material (styled to match Apple Aesthetics)
- **Testing:** Vitest

**Key Features:**
- Energy consumption tracking
- Meter and reading management
- Cost calculation based on tariffs
- Reporting and statistics

## 2. Features Log

*This section will be updated as features are refactored or added.*

## 3. Current Plan

*This is the task breakdown for the refactoring effort.*
- [x] **Phase 1: Project Setup & Global Styling**
    - [x] Create `blueprint.md` file.
    - [x] Implement global theme (light/dark modes) based on Apple design principles in `styles.scss`.
    - [x] Add base styles for typography, layout, and accessibility (e.g., focus rings).
- [x] **Phase 2: Architectural Refactoring**
    - [x] Update `app.config.ts` to use Zoneless Change Detection.
    - [x] Systematically refactor each component:
        -   Rename component files to the "ultra-lean" convention. (Already done)
        -   Convert constructor injection to `inject()`. (Already done)
        -   Migrate state management from RxJS to Signals. (Already done)
        -   Update component I/O to use `input()`/`output()`/`model()`. (Not applicable yet)
        -   Convert templates to use `@if`/`@for`/`@switch` control flow. (Already done)
- [ ] **Phase 3: UI & Style Refactoring**
    - [ ] Restyle core components (Buttons, Cards, Inputs, Modals) to match the Apple aesthetic.
    - [ ] Apply "Frosted Glass" effect to appropriate surfaces.
    - [ ] Ensure all interactive elements meet the `44x44px` target and have correct micro-interactions.
- [ ] **Phase 4: Accessibility & Verification**
    - [ ] Audit all components for semantic HTML and ARIA attributes.
    - [ ] Verify keyboard navigation and focus management.
    - [ ] Run `ng build` continuously to check for compilation errors.
    - [ ] Perform final review.
