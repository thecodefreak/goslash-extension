# GoSlash

GoSlash is a Chrome extension that lets you jump to sites using short keywords from the address bar.

## Installation

### From Chrome Web Store
1. Visit the [GoSlash Chrome Web Store page](#).
2. Click "Add to Chrome".

### Manual Installation (Developer Mode)
1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked" and select the `go-slash-extension` folder.

## Usage

### Basic Shortcuts
1. In the address bar, type `go` and press Space or Tab.
2. Type a shortcut and press Enter.

### Examples
- `go yt` - Opens YouTube
- `go gm` - Opens Gmail
- `go council/tax` - Opens your council tax page
- `go council/election` - Opens your council election page
- `go gh/openai` - Opens github.com/openai
- `go g gpt 5.2` - Searches Google for "gpt 5.2"
- `go /` - Opens GoSlash settings

### Default Shortcuts
| Keyword | Destination | Template |
|---------|-------------|----------|
| `yt` | YouTube | - |
| `gm` | Gmail | - |
| `gh` | GitHub | `{path}` support |
| `g` | Google Search | `{query}` support |

## Features

### Add and Edit Shortcuts
Open the extension options page (`go /`) to add, edit, or delete shortcuts.

### Shortcut Groups
Organize shortcuts with an optional group:
- In settings, switch to **Group** mode and create a group (for example `council`).
- Use Group mode to manage groups with full CRUD:
  - Create a new group.
  - Rename a group (all linked shortcuts are updated automatically).
  - Delete a group only when no shortcuts are linked to it.
- Switch to **Shortcut** mode and select a group from the dropdown.
- Add keywords under it such as `tax` and `election`.
- Use them as `go council/tax` and `go council/election`.

### Template Support
Create dynamic shortcuts with template variables:
- `{path}` - Inserts path segments after the keyword (e.g., `go gh/openai` -> `github.com/openai`)
- `{query}` - Inserts the remaining text as a query (e.g., `go g hello world` -> Google search for "hello world")

### Filter Shortcuts
Use the search box on the options page to quickly filter shortcuts by keyword, URL, or title.

### Usage Statistics
Track how often each shortcut is used:
1. Enable "Show usage stats" toggle on the options page.
2. View usage count for each shortcut.
3. Click the "Usage" column header to sort by most/least used.
4. The usage column visibility transitions smoothly when toggled.

### Import and Export
- **Import**: Merge shortcuts from a JSON file (existing shortcuts are preserved).
- **Export**: Download your shortcuts and groups as a JSON file with metadata (version, timestamp).
- **Reset**: Restore the default shortcuts.

### Export Format
```json
{
  "name": "GoSlash",
  "version": "1.0.0",
  "exportedAt": "2026-02-07T12:00:00.000Z",
  "groups": ["council"],
  "shortcuts": [
    { "group": "council", "keyword": "tax", "url": "https://example.com/tax", "title": "Council Tax" }
  ]
}
```

## Privacy

GoSlash stores all data locally using Chrome's sync storage. No data is sent to external servers. Usage statistics are stored locally and are never shared.

## Permissions

- **storage**: Required to save and sync your shortcuts across devices.

## Development Notes

The options page script is split into focused modules:
- `options/state.js` - shared UI state, DOM references, constants.
- `options/ui.js` - mode tabs, toasts, and common UI behavior.
- `options/shortcuts.js` - shortcut rendering and shortcut CRUD/import/export/reset.
- `options/groups.js` - group list rendering and group CRUD rules.
- `options/data.js` - storage load/init helpers.
- `options.js` - entrypoint and event wiring.

## License

MIT License
