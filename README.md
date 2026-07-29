# Casefile Builder v2.0

FBI Criminal Investigation Division — BBCode Report Generator for forum casefiles.

## Features

- **Auto-date** from system clock
- **Charge presets** with searchable dropdown (custom charges supported)
- **Image editor** — crop / blur / undo / redo before upload
- **Image upload** via [uploadimgur.com](https://uploadimgur.com) proxy
- **Passport auto-link** — generates signature URL from suspect name (editable)
- **Evidence per charge** — image (`[img]`), video (`[video]`), and plain text
- **BBCode generation** — one-click copy to forum
<!-- - **Auto-fill** from Lua game script (`casefile_data.js`) -->

## Quick Start

```bash
# 1. Start the local server (required for image uploads)
python server.py

# 2. Browser opens automatically to http://localhost:5000/index.html
```

## File Structure

| File | Purpose |
|------|---------|
| `index.html` | Main UI |
| `styles.css` | Design system (dark cyberpunk theme) |
| `app.js` | Core logic — charges, evidence, BBCode |
| `image-editor.js` | Canvas crop/blur editor with undo/redo |
| `upload.js` | Image upload via local proxy |
| `server.py` | Local server + upload proxy |
| `imgur_upload.py` | Standalone desktop uploader (tkinter) |

## Requirements

- Python 3.x with `requests` (`pip install requests`)
- Modern browser (Chrome/Edge/Firefox)

## ⚠️ Upload Disclaimer

Please note that the built-in image upload tool (`uploadimgur` / `upload.js` via local proxy) uploads your images **publicly and exclusively to Imgur** via their API. 
- You do not need an Imgur account to use this feature, as it utilizes an anonymous API upload.
- Any image cropped, blurred, or pasted into the tool is transmitted to Imgur's servers and a public link is generated.
- Ensure that any sensitive or highly classified real-world information is blurred or omitted before uploading.

## Upcoming Ideas

- Direct posting to forums from the app interface
- Charge stacking checks and validations
- Various Quality of Life (QoL) updates
