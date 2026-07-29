# Changelog

All notable changes to the Casefile Generator project will be documented in this file.

## [Unreleased]

### Added
- **Title Generation**: The generator now automatically outputs a forum-ready title in the format `IC Name (OOC Name) - Date - Suspect Name` alongside the BBCode output.
- **Title Copy Button**: Added a dedicated `COPY TITLE` button in the Output Section.
- **User Settings (⚙)**: 
  - Added a new Settings modal accessible via the gear icon in the top right.
  - Users can now store their **OOC Name** and **Rank**.
  - **OOC Name** is automatically appended to the "Operating Agent(s)" field when empty.
  - **Rank** dynamically replaces the default "Agent" string in the Official Declaration.
  - Both fields persist across sessions using browser local storage.

### Changed
- **Recommended Process Default**: Pre-filled the `Recommended Process` input with "Immediate Arrest" as a standard default.

### Fixed
- **Image Editor UX Bug**: Fixed an issue in `image-editor.js` where clicking the "✓ Done" button immediately after drawing a crop or blur selection would skip the pending action and upload the unedited image. The editor now automatically applies the pending crop/blur action before finalizing the image.

### Removed
- **Lua Auto-Fill Feature**: Removed the `casefile_data.js` Lua game integration, as data entry is now solely intended to be done within the browser interface.
