# PWA Install

## Purpose

Define how System CLOIE surfaces its installable PWA on the landing page: eligibility via the browser's installability signal, a user-gesture install flow, suppression in installed states, and accessible presentation.

## Requirements

### Requirement: Install affordance appears only on compatible devices

The landing page SHALL display an "Install app" button only when the browser signals installability by firing `beforeinstallprompt`. Browsers that never fire the event (Safari, Firefox, iOS Safari) SHALL see no install button. The system MUST NOT use user-agent sniffing to decide eligibility.

#### Scenario: Compatible Chromium browser

- **WHEN** a user opens the landing page in a Chromium browser that meets installability criteria
- **THEN** the `beforeinstallprompt` event fires and an "Install app" button appears in the landing page header

#### Scenario: Incompatible browser

- **WHEN** a user opens the landing page in a browser that never fires `beforeinstallprompt` (e.g., Safari or Firefox)
- **THEN** no install button is rendered

#### Scenario: Event fires repeatedly

- **WHEN** the browser fires `beforeinstallprompt` more than once during a page session
- **THEN** the system keeps only the latest event for use on click and still renders a single button

### Requirement: User can install the app from the landing page

Clicking the install button SHALL invoke the browser's install prompt from within the user gesture. The system MUST suppress the browser's automatic install UI when it captures `beforeinstallprompt`, so the user is not double-prompted.

#### Scenario: Successful install

- **WHEN** the user clicks "Install app" and accepts the browser's install prompt
- **THEN** the app installs, the button is removed from view, and a confirmation toast reading "System CLOIE installed" is shown

#### Scenario: Prompt dismissed

- **WHEN** the user clicks "Install app" and dismisses the browser's install prompt
- **THEN** the button is removed from view for the remainder of the visit

### Requirement: Installed state suppresses the install button

The install button SHALL NOT be rendered while the application is running in installed mode (`display-mode: standalone`) or after an `appinstalled` event fires.

#### Scenario: Opening the installed app

- **WHEN** the user opens System CLOIE from the installed app icon
- **THEN** no install button is rendered on the landing page

#### Scenario: Install completes during the session

- **WHEN** the browser fires `appinstalled` after a successful install
- **THEN** the install button is removed from view

### Requirement: Install button is accessible

The install button SHALL expose an accessible name describing the action and the product, SHALL meet the application's touch-target minimum of 44×44 px, and SHALL include both an icon and a visible text label.

#### Scenario: Screen reader announcement

- **WHEN** a screen reader user focuses the install button
- **THEN** the button announces "Install System CLOIE app"

#### Scenario: Touch interaction

- **WHEN** a user taps the install button on a touch device
- **THEN** the tap area is at least 44×44 px and the browser install prompt opens
