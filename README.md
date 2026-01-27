# GoSlash

GoSlash is a Chrome extension that lets you jump to sites using short keywords from the address bar.

## Load the extension
1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked" and select the `go-slash` folder.

## Use shortcuts
1. In the address bar, type `go` and press Space or Tab.
2. Type a shortcut and press Enter.

Examples:
- `go yt`
- `go gm`
- `go gh/openai`
- `go g gpt 5.2`

## Add shortcuts
Open the extension options page and add keywords with target URLs.

Template support:
- `{path}` inserts path segments after the keyword.
- `{query}` inserts the remaining query text.

Example URL templates:
- `https://github.com/{path}`
- `https://www.google.com/search?q={query}`

## Import, export, reset
- Import JSON merges without duplicates (existing keywords are kept).
- Export downloads your shortcuts as JSON.
- Reset restores the default shortcuts.
