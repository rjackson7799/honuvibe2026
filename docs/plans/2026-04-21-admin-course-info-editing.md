# Plan: Editable Course Info Fields in Admin

## Context

The admin course detail page (`/admin/courses/[id]`) displays a grid of read-only `InfoField` cards (Level, Language, Format, Prices, Dates, etc.). There is no way to update these values without the AI course wizard. This plan adds inline editing to all 10 editable fields in that grid, matching the existing per-field edit pattern already used for descriptions and free preview count.

## Fields to Make Editable

| Field | Input Type | Notes |
|---|---|---|
| Level | `<select>` | `beginner \| intermediate \| advanced` |
| Language | `<select>` | `en \| ja \| both` |
| Format | `<select>` | Common values: `Self-Paced Recorded Lessons with Downloadable Guides`, `Live Cohort`, `Hybrid` + free text fallback |
| Total Weeks | `<input type="number">` | min 0 |
| Live Sessions | `<input type="number">` | min 0 |
| Recorded Lessons | `<input type="number">` | min 0 |
| Price (USD) | `<input type="number">` | User enters dollars; save `Math.round(val * 100)` as cents |
| Price (JPY) | `<input type="number">` | User enters whole yen; save as-is |
| Start Date | `<input type="date">` | Stored as `YYYY-MM-DD` string |
| Community | `<select>` | Common values: `Discord`, `Skool`, `LINE`, `Circle` + free text |
| Max Enrollment | `<input type="number">` | min 1; allow clearing to null ("Unlimited") |

**Not editable in the grid** (already handled elsewhere):
- Visibility (`is_private`) — has a dedicated toggle below the grid
- Instructor(s) — managed by `InstructorAssignControl` above the grid

## Architecture: `EditableInfoField` Component

Replace the static `InfoField` calls in the grid with a new local component `EditableInfoField` defined at the bottom of `AdminCourseDetail.tsx`. This keeps everything in one file and avoids a new file for a small shared component.

```tsx
type FieldInputType = 'number' | 'select' | 'date' | 'text';

function EditableInfoField({
  label,
  displayValue,
  inputType,
  options,
  defaultEditValue,
  onSave,
}: {
  label: string;
  displayValue: string;
  inputType: FieldInputType;
  options?: { label: string; value: string }[];
  defaultEditValue: string;
  onSave: (value: string) => Promise<void>;
}) { ... }
```

Each `EditableInfoField` manages its own `editing`, `saving`, and `draft` state internally — no new state in the parent `AdminCourseDetail`. An edit pencil icon appears on hover. When editing, an inline input replaces the value display with Save/Cancel buttons.

## Write Path

All saves use the existing `updateCourse(course.id, { field: value })` server action (already imported in `AdminCourseDetail.tsx`) followed by `router.refresh()`. No new API routes needed.

## Files to Modify

- `components/admin/AdminCourseDetail.tsx`
  - Replace `InfoField` calls at lines 382–411 with `EditableInfoField` calls
  - Add new `EditableInfoField` component near line 960 (alongside existing `InfoField`)

## Format Field Options

The `format` field is free text at DB level. Common values from the parser/generator: `"Self-Paced Recorded Lessons With Downloadable Guides"`, `"Live Cohort"`, `"Hybrid"`. Use a `<select>` with those 3 + a custom "Other…" option that reveals a text input.

## USD Price Encoding

- Display: `price_usd / 100` (cents → dollars)
- Edit default: `price_usd ? (price_usd / 100).toString() : ''`  
- On save: `Math.round(parseFloat(draft) * 100)` or `null` if empty

## Verification

1. Navigate to `/admin/courses/[id]` for any course
2. Hover any InfoField card — pencil icon appears
3. Click pencil — inline input appears with current value pre-filled
4. Change value, click Save — spinner, then value updates via `router.refresh()`
5. Click Cancel — restores display without saving
6. Verify Price USD: enter `299` → DB stores `29900`
7. Verify Start Date: pick a date → DB receives `YYYY-MM-DD`
