# Jupyter Explorer for Obsidian

![](./src/jupyter_explorer_image.png)

View Jupyter notebooks (`.ipynb`) directly in Obsidian. The plugin turns saved notebook cells and their captured outputs into a readable, native-feeling Obsidian view without requiring a Jupyter installation or a running kernel.

> This plugin is a viewer: notebooks are never executed or edited by the plugin.

## Features

- Opens `.ipynb` files directly from the Obsidian file explorer.
- Supports Jupyter `nbformat` 4 notebooks and legacy `nbformat` 3 worksheets.
- Renders Markdown cells through Obsidian's Markdown renderer, including cell attachments.
- Displays code cells with the notebook language, execution counts, and line numbers.
- Shows saved output from `stdout`, `stderr`, execution results, and error tracebacks.
- Renders plain text, Markdown, HTML tables (such as pandas DataFrames), PNG, JPEG, and SVG outputs.
- Shows raw cells as preformatted text.
- Displays detected kernel and language information when the notebook contains it.
- Keeps notebook content selectable for easy copying.
- Exports the current rendered notebook to PDF on Obsidian desktop.

## Installation

### From the Obsidian Community Plugins directory

1. Open **Settings** in Obsidian.
2. Go to **Community plugins** and turn off Restricted mode if prompted.
3. Select **Browse**, search for **Jupyter Explorer**, then choose **Install**.
4. Enable the plugin.

### Manual installation

1. Download the latest release archive.
2. Create the folder `.obsidian/plugins/jupyter-viewer/` in your vault.
3. Copy `main.js`, `manifest.json`, and `styles.css` into that folder.
4. In Obsidian, enable **Jupyter Explorer** under **Settings > Community plugins**.

## Usage

Place an `.ipynb` file anywhere in your vault and open it from the file explorer. Obsidian will open it in Jupyter Explorer.

To export the open notebook, open the Command Palette and run **Export Jupyter Explorer notebook to PDF**. You will be asked where to save the PDF. PDF export is available on desktop Obsidian only.

## Supported Content

| Notebook content | Support |
| --- | --- |
| Markdown cells | Rendered using Obsidian Markdown |
| Markdown attachments | Inline images from notebook attachments |
| Code cells | Syntax-highlighted source, execution count, and line numbers |
| Stream output | `stdout` and `stderr` |
| Results and display data | Plain text, Markdown, HTML, PNG, JPEG, and SVG |
| Errors | Saved error name, message, and traceback |
| Raw cells | Preformatted text |

## Limitations

- The plugin is read-only and cannot create, edit, or execute notebook cells.
- It displays outputs saved in the `.ipynb` file. Run the notebook in Jupyter or another compatible environment to refresh outputs.
- Interactive Jupyter widgets and outputs that require a live kernel are not supported.
- PDF export captures the rendered notebook content and may not perfectly reproduce every Obsidian theme or third-party styling detail.

## Troubleshooting

- **The notebook does not open:** Confirm the file extension is `.ipynb` and that the file contains valid notebook JSON.
- **Output is missing:** The notebook was likely saved without outputs. Execute and save it in Jupyter, then reopen it in Obsidian.
- **PDF export is unavailable:** Make sure the notebook is open in Jupyter Explorer and use the desktop app.
- **Changes are not reflected during manual development:** Reload Obsidian or disable and re-enable the plugin after copying updated build files.

## Development

Requirements: Node.js and npm.

```shell
npm install
npm run dev
```

Build a production bundle with:

```shell
npm run build
```

The build produces `main.js`. Install or package `main.js`, `manifest.json`, and `styles.css`.

## Contributing

Bug reports and pull requests are welcome. Please include a minimal `.ipynb` example when reporting a rendering issue, along with your Obsidian version and operating system.

## License

This project is released under the [MIT License](LICENSE).