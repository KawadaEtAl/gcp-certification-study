---
name: gcp-console-screenshot
description: >-
  Use this skill when capturing, DOM-masking, verifying, and embedding Google Cloud Console
  screenshots into the study app (app/) and Markdown notes (notes/) using /browser.
---

# GCP Console Screenshot & Masking Workflow

Capture clean, consistent, PII-free Google Cloud Console screenshots ("このページだよ" visuals) for `app/` (GCP Architecture Explorer) and `notes/`.

## Safety & Privacy Rules (Mandatory)

1. **Read-only navigation only**: Never create, edit, delete, apply recommendations, or change IAM / Billing / Cloud Run resources.
2. **Never commit personal strings to Git**: Keep real project names, project IDs, project numbers, emails, display names, and billing IDs strictly inside gitignored `local/gcp-mask-config.json`.
3. **Always mask BEFORE screenshotting**: Run the DOM sanitizer via `evaluate_script` and confirm `remainingMatches.length === 0` before saving any PNG.
4. **Always visually inspect**: Open every saved screenshot with `read_file` and verify zero PII remains (top bar project picker, headings, tables, tooltips, notifications, right-top avatar icon).

## Standard Capture Settings

- **Language**: Append `?hl=ja` to Console URLs (Japanese UI).
- **Viewport**: `1280x800` (fixed across all weeks so aspect ratio and typography match).
- **Output directory (single source of truth)**: `app/public/screenshots/weekXX/<slug>.png`
  - App references as `./screenshots/weekXX/<slug>.png`
  - Notes (`notes/weekXX-*.md`) reference as `../app/public/screenshots/weekXX/<slug>.png`

## Step-by-Step Procedure

### 1. Prepare the Masking Script

Generate the ready-to-run JavaScript snippet (merges gitignored `local/gcp-mask-config.json` with generic patterns):

```bash
python3 .agents/skills/gcp-console-screenshot/scripts/build_mask_script.py
```

If `local/gcp-mask-config.json` does not exist yet, create it with the structure:

```json
{
  "replacements": [
    { "from": "My Real Project Name", "to": "gcp-study-sandbox" },
    { "from": "my-real-project-id", "to": "gcp-study-sandbox" },
    { "from": "123456789012", "to": "123456789012" },
    { "from": "real-email@gmail.com", "to": "study-admin@example.com" },
    { "from": "Real Name", "to": "Taro Yamada" }
  ],
  "forbiddenPatterns": [
    "my-real-project-id",
    "real-email@gmail.com"
  ]
}
```

### 2. Navigate & Wait (`/browser`)

1. Resize the browser viewport to `1280x800`.
2. Navigate to the target GCP Console URL (see [references/week01-targets.md](./references/week01-targets.md) for Week 1 targets).
3. Wait until main tables/cards finish rendering (no skeleton loaders or spinners).
4. Dismiss transient banners/popups if they obscure the main UI (without applying any settings).
5. If a page uses tabs (e.g., IAM `許可しない`), click only the read-only navigation tab.

### 3. Mask DOM & Verify Zero Leakage

1. Execute the generated `mask_gcp_console.js` snippet via `evaluate_script`.
2. Inspect the returned JSON report:
   - Confirm `remainingMatches` is `[]` (empty).
   - Confirm `maskedAvatars >= 1` when the top-right Google Account avatar is visible.
3. If GCP dynamically re-renders any text, re-run the script immediately before capturing.

### 4. Capture & Optimize

1. Capture a **viewport screenshot** (not full browser window chrome) and save to:
   `app/public/screenshots/weekXX/<slug>.png`
2. Run the verification & optimization script:

```bash
python3 .agents/skills/gcp-console-screenshot/scripts/verify_screenshot.py app/public/screenshots/weekXX/<slug>.png
```

3. Open the saved PNG with `read_file` and visually confirm:
   - No real name, email, project name/ID, project number, billing ID, or personal profile photo appears.
   - Left navigation menu and main page heading are legible (so readers immediately recognize "このページだよ").

### 5. Wire into App & Notes

1. In `app/src/data/weekXX.ts`, set `imagePath: './screenshots/weekXX/<slug>.png'` on the corresponding `consoleScreens` entry.
2. In `notes/weekXX-*.md`, insert or verify the Markdown image link under the matching Part:
   `![キャプション](../app/public/screenshots/weekXX/<slug>.png)`
3. Run `cd app && npm run build` to confirm a clean build before finishing.
