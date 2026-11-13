# UI/UX Specification

**Project:** SILICON DYNASTY  
**Design System:** Modern Corporate / Premium Technology Simulator  
**Platform:** Android + Web  
**Stack:** React + TypeScript + Tailwind CSS + Capacitor

## 1. Visual Direction

Modern Corporate: light minimalist interface, white and light-gray surfaces, blue accents, readable typography, restrained cards, clear tables and charts.

Prioritize information hierarchy over decoration.

### Design principles

- Premium technology aesthetic.
- Clean and consistent visual hierarchy.
- Neutral backgrounds and carefully selected accent colors.
- Subtle borders, shadows and rounded corners.
- Consistent spacing and component proportions.
- No unnecessary gradients, decorative elements or visual clutter.
- Avoid the appearance of a generic administrative dashboard.
- The interface should feel like a premium technology tycoon game.

Support both Light Theme and Dark Theme.

Light Theme is the primary design direction.

## 2. Mobile-first and Responsive Design

Portrait-first, safe-area aware, touch-friendly.

Primary target: Android smartphones.

Additional targets:
- Small smartphones.
- Large smartphones.
- Tablets.
- Web desktop.

Tables may become cards or horizontally scrollable panels. Never rely on hover as the only way to access information. Forms should be grouped into logical sections.

### Screen geometry

- Never rely on `100vh` for the application viewport.
- Use `100dvh` where supported.
- Root application container should control overflow.
- Account for top, bottom and horizontal safe areas.
- Use internal scrolling containers instead of uncontrolled page scrolling.
- Prevent unwanted overscroll and rubber-band scrolling.
- Handle the appearance of the Android keyboard.
- Ensure controls remain accessible when the keyboard is open.

Recommended CSS patterns:

```css
.app-root {
  height: 100dvh;
  overflow: hidden;
  overscroll-behavior: none;
}

.safe-top {
  padding-top: env(safe-area-inset-top);
}

.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.scroll-area {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
```

Use `min-height: 0` in nested flex layouts when necessary to prevent scrolling issues.

### Touch behavior

Interactive elements should use:

- `touch-manipulation`.
- `select-none` where text selection is undesirable.
- `active:scale-95`.
- `transition-transform duration-150 ease-out`.

Minimum touch target: 44×44 px.

Do not disable text selection globally. Inputs, text fields and copyable technical values must remain selectable.

## 3. Typography

Use the bundled Manrope variable font with native fallbacks:

```css
font-family:
  "Manrope Variable",
  "Manrope",
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  "Roboto",
  sans-serif;
```

The font is bundled locally through `@fontsource-variable/manrope`; do not depend on a network font request. Manrope must include Cyrillic and Latin coverage.

Use `tabular-nums` for:

- Company balance.
- Revenue and expenses.
- CPU/GPU specifications.
- Frequencies and power consumption.
- Temperatures.
- Manufacturing quantities.
- Research progress.
- Market share.
- Timers and game statistics.

Maintain consistent heading sizes, readable body text and sufficient contrast.

### Shared UI primitives

Use the shared primitives in `src/components/ui` for new UI work:

- `Button` for primary, secondary, ghost and destructive actions.
- `Card` for compact surfaces and grouped content.
- `Panel` for titled sections with optional description, icon and action.
- `Field` for label, hint, error and form control composition.

Primitives own the common visual behavior; screen-specific classes may add layout or domain styling without redefining base button, card or field behavior.

Layouts must tolerate long translated strings.

## 4. Navigation

Available destinations:

- Dashboard
- Company
- Research
- Hardware
- CPU Designer
- GPU Designer
- Components
- OS Lab
- AI Lab
- Software Studio
- Devices
- Cloud
- Manufacturing
- Market
- Finance
- Analytics
- Ecosystem
- Settings

Use compact mobile navigation; do not force every destination into a bottom bar.

### Main menu

The game opens on a full-screen main menu when no campaign interaction has started. It must provide:

- Current campaign summary: company, date, capital and era.
- Continue, New Game and Settings actions.
- A destructive confirmation before New Game resets progress.
- Keyboard support: Escape closes the menu, and the primary action receives initial focus.

The main menu is also reachable from the desktop sidebar and the mobile header. It must not replace the primary bottom navigation.

### Mobile navigation

Use a bottom navigation bar for the primary destinations.

On narrow Android widths (360-390 px), show four primary destinations - dashboard, research, the processor workspace and market - plus an «Ещё» destination. «Ещё» opens a focus-trapped sheet for company and settings instead of squeezing six labels into the bar. Every destination must remain reachable and keyboard accessible.

Recommended height: 60-68 px plus bottom safe area.

Visual characteristics:

- Translucent surface.
- Subtle backdrop blur.
- Thin top border.
- Clear active state.
- Touch targets of at least 44×44 px.

Use secondary navigation, nested sections, drawers or dedicated screens for less frequently accessed destinations.

Avoid overcrowding the bottom navigation.

## 5. Dashboard

Show:

- Game date and time controls.
- Company balance.
- Income.
- Expenses.
- Profit.
- Market value and share.
- Sales.
- Active products.
- A command center with quick actions and actionable signals.
- A company pulse with 14-day trends for revenue, net profit and market share, derived from real finance and market records.
- First-run quick start guidance until the tutorial is complete or the player dismisses it.
- Research.
- Manufacturing.
- OS projects.
- AI projects.
- Events.

### Dashboard presentation

Use compact information cards, charts, progress indicators and prioritized event lists.

Important financial and production indicators should be immediately visible.

Avoid excessive scrolling for the most important company information.

## 6. Designer Screens

Each designer includes:

- Project identity.
- Parameter groups.
- Contextual help.
- Validation.
- Calculated results.
- Costs and requirements.
- Version saving.
- Configuration comparison.

Use progressive disclosure for advanced settings without removing expert access.

### CPU Designer

Present:

- ISA.
- Architecture.
- Microarchitecture.
- Cores and threads.
- Frequency.
- IPC.
- Cache hierarchy.
- Memory controller.
- SIMD.
- Manufacturing process.
- Voltage.
- TDP.
- Die area.
- Estimated cost.
- Saved-version comparison with market performance, manufacturing cost, benchmark throughput, memory bandwidth and temperature deltas.

### GPU Designer

Present:

- Architecture.
- Compute units.
- Clock frequency.
- VRAM.
- Memory bandwidth.
- Cache.
- AI acceleration.
- Power consumption.
- Temperature.

### Components Designer

Present component specifications, compatibility, manufacturing costs and performance characteristics.

- Saved-version comparison with performance index, unit cost, suggested price, gross margin and power draw deltas.

### Designer interaction principles

- Group related parameters.
- Explain technical terms.
- Clearly distinguish editable parameters from calculated values.
- Show dependencies between parameters.
- Display validation errors next to relevant controls.
- Update simulation results when parameters change.
- Provide configuration comparison.
- Protect unsaved changes.

Do not overwhelm the initial screen with every advanced parameter simultaneously.

## 7. Research Interface

Use a visual technology research tree.

Show:

- Research categories.
- Technology dependencies.
- Unlock conditions.
- Research costs.
- Progress.
- Completed technologies.
- Locked technologies.
- Future research opportunities.

Clearly communicate why a technology is unavailable.

## 8. OS Lab

Represent operating system development through specialized technical panels.

Include:

- Kernel architecture.
- Bootloader.
- Scheduler.
- Memory management.
- IPC.
- System calls.
- Drivers.
- Filesystems.
- Networking.
- Security.
- Permissions.
- Updates.
- Package management.
- Diagnostics.
- GUI.
- SDK and API.

Use architecture diagrams, subsystem cards, compatibility indicators and development progress.

Group the configuration editor into accessible tabs for core, system services and ecosystem settings, with validation-error counts on each tab. Keep the live preview sticky beside the editor on wide screens and above the editor on mobile.

Show a live visual OS preview derived from the current draft configuration and latest saved release. The preview must evolve through terminal, desktop shell, modern desktop and adaptive GUI levels, use a platform-appropriate device frame (desktop, mobile, server or gaming), reflect Alpha/Beta/RC/Stable release polish, and unlock or lock application icons from real compatibility results. Provide a release-history selector for saved Alpha/Beta/RC/Stable snapshots so the preview can show the interface at each release, with the current configuration as the default view. Opening a compatible application must show app-specific simulated content rather than generic rows; incompatible applications must explain the missing requirements. It is a game simulation, not a real operating system, and must not create a second persisted configuration.

## 9. AI Lab

Present:

- Model architecture.
- Model parameters.
- Datasets.
- Training configuration.
- Evaluation metrics.
- Hardware requirements.
- Training progress.
- Fine-tuning.
- Quantization.
- Pruning.
- Distillation.
- Deployment.

Use charts to visualize simulated training and evaluation results.

Clearly distinguish simulated results from real-world AI training.

## 10. Economy and Market

Use dedicated visualizations for:

- Revenue.
- Expenses.
- Profit.
- Production costs.
- Product prices.
- Sales.
- Market share.
- Competitors.
- Market segments.
- Inventory.
- Supply and demand.

Use charts, comparison panels and compact financial cards.

The Market overview must include a 14-day market pulse with accessible sparklines for market share, player revenue and units sold, derived from real daily summaries. Show an empty state until the first simulated market day.

All monetary values must use consistent formatting.

### Analytics

Analytics is a third tab in the Market/Finance workspace. It must:

- Offer 7/30/90-day report ranges and a CSV export of the selected daily summary.
- Show revenue, profit, market share, balance, expense breakdown, cash runway, market segments, top products and technology portfolio data from real game state.
- Use accessible SVG charts with a title, description, axes and a readable legend.
- Reuse the existing metric cards, tables, localization and design tokens.

## 11. Charts

Label axes and units, identify workload and distinguish simulated values from forecasts.

Avoid false precision.

Requirements:

- Every chart must have a clear title.
- Axes must include units where applicable.
- Legends must be readable.
- Important values should have labels or tooltips.
- Use consistent scales when comparing datasets.
- Support narrow mobile screens.
- Avoid unnecessary visual effects.

Prefer SVG or Canvas-based visualizations.

## 12. Cards and Information Panels

Use cards for logically grouped information.

Recommended visual structure:

- Background surface.
- Subtle border.
- Consistent rounded corners.
- Moderate internal spacing.
- Clear title and metadata.
- Optional status indicator.
- Compact supporting information.

Avoid excessive nesting of cards.

Use horizontal scrolling for related items where appropriate.

## 13. Bottom Sheets and Dialogs

Prefer mobile-native Bottom Sheets for contextual actions.

Requirements:

- Rounded top corners.
- Visible drag handle.
- Background dimming.
- Safe-area support.
- Internal scrolling.
- Accessible action buttons.

Use full-screen panels for complex workflows.

Use confirmation dialogs for destructive or irreversible actions.

Do not use desktop-style centered modals as the default mobile interaction pattern.

## 14. States

Every screen must handle:

- Loading, using content-shaped skeletons for lazy screens rather than a blank page or lone spinner.
- Empty.
- Error.
- Validation.
- Success.
- Disabled states.

Explain why an action is unavailable.

Disabled controls should provide an understandable reason.

Do not leave empty white screens or unexplained blank panels.

## 15. Accessibility

Use sufficient contrast, labels, predictable navigation, confirmation for destructive actions and protection against losing unsaved edits.

Additional requirements:

- Interactive elements must have accessible labels.
- Keyboard navigation must work on Web.
- Focus states must be visible.
- The application shell must provide a “Skip to content” link that moves keyboard focus to the main content region.
- After primary navigation, focus must move to the main content region without stealing focus on first load.
- Modal dialogs and bottom sheets must trap Tab and Shift+Tab within the dialog, close on Escape when appropriate, and restore focus to the previously focused control.
- Save, error and status feedback regions must use appropriate `aria-live` politeness and `aria-atomic` behavior.
- Motion must be purposeful and respect `prefers-reduced-motion`; page, menu and sheet transitions must not be required to understand state.
- Icons must not be the only source of meaning.
- Status information must not rely exclusively on color.
- Respect user font scaling where possible.
- Support long translated strings.
- Maintain usable touch targets.

## 16. Capacitor Integration

The application must support native mobile behavior.

Relevant APIs:

- `@capacitor/haptics`
- `@capacitor/status-bar`
- Capacitor App lifecycle.
- Android back button.
- Safe Area handling.

### Haptics

Use haptic feedback for important actions:

- Purchases.
- Research completion.
- Rewards.
- Important confirmations.
- Errors.

Example:

```typescript
import { Haptics, ImpactStyle } from "@capacitor/haptics";

await Haptics.impact({
  style: ImpactStyle.Light,
});
```

Use safe fallbacks when native APIs are unavailable.

Do not trigger haptics for every interaction.

### Status Bar

Configure the status bar centrally according to the active theme.

Prevent system status-bar content from becoming unreadable.

## 17. React and Component Architecture

Use:

- React.
- TypeScript strict mode.
- Tailwind CSS.
- Reusable components.
- Shared design tokens.
- Lucide React icons.

Separate presentation from simulation logic.

Do not put all screen logic into a single component.

Do not duplicate components or design tokens.

Keep UI components independent of direct domain-data mutation.

All game-state changes must go through the appropriate game systems.

## 18. Interaction Quality

Every visible interactive element must perform its advertised action.

Implement:

- Loading feedback.
- Success feedback.
- Error feedback.
- Disabled states.
- Validation.
- Confirmation where necessary.

Do not create decorative buttons that do nothing.

Do not use mock data when actual game data is available.

If mock data is necessary during development, clearly isolate it from production game logic.

## 19. Design Consistency

All screens must follow the same design system.

Maintain consistency in:

- Colors.
- Typography.
- Spacing.
- Border radius.
- Shadows.
- Button styles.
- Input styles.
- Cards.
- Navigation.
- Feedback states.

New UI components must reuse existing design tokens and components whenever possible.

Do not introduce a separate visual design system without approval.

## 20. UI Development Workflow

Before creating or modifying an interface:

1. Inspect the existing project structure.
2. Read this specification.
3. Inspect existing shared components and design tokens.
4. Understand the screen's gameplay purpose.
5. Define its information hierarchy.
6. Implement the interface using existing architecture.
7. Connect actual game data and actions where available.
8. Handle responsive layouts and Safe Areas.
9. Implement loading, empty, error and disabled states.
10. Verify TypeScript, build and relevant tests.

Do not report tests as passed unless they were actually executed.

Do not rewrite unrelated systems.

Preserve existing functionality and user data.

## 21. Core Design Goal

SILICON DYNASTY must feel like a premium mobile technology simulator.

It should combine:

- The clarity of a modern corporate interface.
- The depth of a technology management simulator.
- The usability of a native mobile application.
- The information density required by advanced engineering systems.

The result must be a coherent game interface, not a generic website or administrative dashboard.