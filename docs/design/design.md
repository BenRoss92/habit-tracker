# Habit Tracker — Design Reference

## Colour palette

| Name              | Hex     | Used for                                                                                      |
| ----------------- | ------- | --------------------------------------------------------------------------------------------- |
| Dark navy         | #1a3a5c | Date heading, habit names, stat values                                                        |
| Primary blue      | #1a6bbf | Habit checkboxes, today dot outline, Add button border/text, Add form border, Add button fill |
| Mid blue          | #4a7ab5 | Day strip labels, legend text, stat subtitles                                                 |
| Circle outline    | #5aaad4 | Day strip circle outlines, streak badge 2 border                                              |
| Light blue stroke | #93c5e8 | Streak badge 1 border                                                                         |
| Pale blue fill    | #dbeeff | Day strip circle background, streak badge 1 background                                        |
| Card border       | #b8d4f0 | Habit card borders, stat card borders, empty streak badge border, Cancel button border        |
| Page background   | #EBF4FF | App background                                                                                |
| Icon blue         | #7aaad4 | Edit and delete icons, stat labels                                                            |
| Streak 2 fill     | #93c5e8 | Streak badge 2 background                                                                     |
| Streak 3 fill     | #1a6bbf | Streak badge 3 background                                                                     |
| Streak 3 border   | #1a55a0 | Streak badge 3 border                                                                         |
| All-done fill     | #1a6bbf | Fully completed day strip circle fill                                                         |
| All-done border   | #1a55a0 | Fully completed day strip circle border                                                       |
| Today outline     | #1a6bbf | Today dot blue ring (3px)                                                                     |
| Error red         | #d93025 | Validation error border, error message text                                                   |
| Error bg          | #fff8f8 | Input background on validation error                                                          |
| Disabled          | #b8d4f0 | Disabled button borders, text and backgrounds                                                 |
| Disabled input bg | #f0f4f8 | Disabled input background                                                                     |

## Typography

Font: Nunito (Google Fonts)
Weights used: 400, 500, 600, 700

| Element                      | Size | Weight  | Colour          |
| ---------------------------- | ---- | ------- | --------------- |
| Date heading                 | 22px | 700     | #1a3a5c         |
| Section label ("Habits")     | 18px | 700     | #1a3a5c         |
| Habit name                   | 17px | 600     | #1a3a5c         |
| Day strip labels (M/T/W etc) | 11px | 600     | #4a7ab5         |
| Legend text                  | 11px | 500     | #4a7ab5         |
| Streak badge                 | 15px | 700     | varies by state |
| Stat value                   | 22px | 700     | #1a3a5c         |
| Stat label                   | 11px | 700     | #7aaad4         |
| Stat subtitle                | 12px | 500     | #4a7ab5         |
| Add form label               | 12px | 700     | #1a3a5c         |
| Add form input               | 15px | 500     | #1a3a5c         |
| Add/Cancel buttons           | 14px | 700/600 | varies          |
| Error message                | 12px | 600     | #d93025         |

## Layout

- App background: #EBF4FF, border-radius 16px, padding 1.5rem
- Max width: 600px, centred
- Habit cards: white background, 1.5px #b8d4f0 border, 14px border radius, 1rem 1.25rem padding
- Stats row: 3-column grid, 10px gap
- Stat cards: white background, 1.5px #b8d4f0 border, 12px border radius, 0.85rem 1rem padding

## Header

- Left: current date only (e.g. "Sunday, 6 Jul") — 22px, bold, #1a3a5c. No "Today —" prefix.
- Right: "Add habit" button — white background, 2px #1a6bbf border, 20px border radius, #1a6bbf text, 14px, bold, 9px 20px padding, + icon to left of text

## Day strip

Shows a rolling 7-day window ending today (not a fixed Mon–Sun calendar week).
Each dot is 32px wide and tall, circular.

### Three dot states

| State          | Trigger                           | Appearance                                                                                                                                                                 |
| -------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty          | No habits completed               | Light blue fill (#dbeeff), #5aaad4 outline (2px)                                                                                                                           |
| Partial        | Some but not all habits completed | Proportional clockwise fill in #1a6bbf, light blue (#dbeeff) for unfilled portion, #5aaad4 outline (2px). Fill amount = habits completed ÷ total habits. No dividing line. |
| Complete       | All habits completed              | Fully filled #1a6bbf circle, #1a55a0 border (2px), centred ⭐ emoji in gold (#FFD700), font-size 14px                                                                      |
| Today modifier | Current calendar day              | Blue ring #1a6bbf, 3px stroke, overlaid on whichever state applies                                                                                                         |

### Legend (shown below day strip)

Four items in a row:

- ⭐ filled blue dot — "All habits completed"
- Half-filled dot — "Some habits completed"
- Empty outlined dot — "Nothing completed"
- Blue outlined dot — "Today"

## Habit cards

Each card contains left to right:

- Circular checkbox (28px): unfilled with 2px #1a6bbf border when not done; filled #1a6bbf with white tick when done
- Habit name (17px, weight 600, #1a3a5c)
- Streak badge (right-aligned)
- Edit icon (ti-edit, 17px, #7aaad4)
- Delete icon (ti-trash, 17px, #7aaad4)

## Streak badge — four visual states

| Streak | Background  | Text colour | Border                                    |
| ------ | ----------- | ----------- | ----------------------------------------- |
| 0      | transparent | transparent | 2px #b8d4f0 — empty pill shape, no number |
| 1      | #dbeeff     | #1a5a9e     | 2px #93c5e8                               |
| 2      | #93c5e8     | #0e3d6e     | 2px #5aaad4                               |
| 3+     | #1a6bbf     | #ffffff     | 2px #1a55a0 — with 🔥 emoji prefix        |

All badges: 15px, bold, 5px 13px padding, 20px border radius.

## Stats row — three cards

| Card         | Label        | Value format | Subtitle         |
| ------------ | ------------ | ------------ | ---------------- |
| Today        | TODAY        | X/Y          | habits completed |
| Daily Streak | DAILY STREAK | N            | days active      |
| Best Streak  | BEST STREAK  | 🔥 N         | habit name below |

Stat label: 11px, bold, uppercase, #7aaad4, letter-spacing 0.06em
Stat value: 22px, bold, #1a3a5c
Stat subtitle: 12px, weight 500, #4a7ab5

## Add habit form — three states

The form appears inline at the top of the habit list when the user clicks "Add habit".
The "Add habit" header button fades to 40% opacity for as long as the form is open - one single style covering all three states below (idle, error, and pending alike), not a separate look for pending. The button is already non-interactive in every one of these states, so there's nothing further a distinct "pending" style would communicate.

### State 1 — Form open (idle)

- White card with 1.5px #1a6bbf blue border, 14px border radius
- Label: "Habit name" — 12px, bold, uppercase, #1a3a5c
- Input: 15px, 9px 12px padding, 10px border radius, 1.5px #b8d4f0 border
- Input focuses to 1.5px #1a6bbf border
- Placeholder text: "e.g. Morning run"
- Two buttons below input:
  - "Add" — filled #1a6bbf background, white text, 20px border radius
  - "Cancel" — white background, 1.5px #b8d4f0 border, #4a7ab5 text, 20px border radius

### State 2 — Validation error

- Form card border changes to #d93025 red
- Input border changes to #d93025, input background changes to #fff8f8
- Error message appears directly below the input field (not at top of form or in a banner)
- Error message: 12px, bold, #d93025, with a small alert icon to the left
- Error text: "Please enter a habit name"
- Add and Cancel buttons remain enabled so the user can fix or abandon

### State 3 — Submission pending

- Form card opacity drops to 0.6
- Input is disabled, shows the typed habit name, background #f0f4f8, text #b8d4f0
- Add button is disabled and its contents change from "Add" to a spinner + text inline:
  [ ⟳ Adding… ]
  - Spinner: 14px rotating circle, white, positioned to the left of the text
  - "Adding…" text sits to the right of the spinner
  - Both are horizontally centred within the button
  - Button size and position remain unchanged — only the contents change
  - Button background changes to #b8d4f0 to signal disabled state
- Cancel button is disabled, border and text change to #b8d4f0
- "Add habit" header button is disabled - same 40% opacity fade as States 1 and 2 (see above), not a separate style
- Existing habit cards are unaffected - they stay fully interactive and at full opacity. Adding a habit and acting on a different, existing habit are independent - there's no need to signal the page as "busy" beyond the add-habit form itself
