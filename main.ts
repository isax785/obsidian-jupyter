import {
    Component,
    FileView,
    MarkdownRenderer,
    Plugin,
    TFile,
    WorkspaceLeaf,
} from "obsidian";

const JUPYTER_VIEW_TYPE = "jupyter-notebook-view";
const JUPYTER_EXTENSION = "ipynb";

// ── Notebook types (nbformat 4) ──────────────────────────────────────────────

interface NotebookMetadata {
    kernelspec?: { display_name: string; language: string; name: string };
    language_info?: { name: string; version?: string };
}

interface JupyterNotebook {
    nbformat: number;
    nbformat_minor: number;
    metadata: NotebookMetadata;
    cells: JupyterCell[];
    // nbformat 3 compat
    worksheets?: Array<{ cells: JupyterCell[] }>;
}

// Attachments map: { "filename.png": { "image/png": "<base64>" } }
type CellAttachments = Record<string, Record<string, string | string[]>>;

interface JupyterCell {
    cell_type: "markdown" | "code" | "raw";
    source: string | string[];
    metadata: Record<string, unknown>;
    outputs?: JupyterOutput[];
    execution_count?: number | null;
    attachments?: CellAttachments;
}

type OutputData = Record<string, string | string[]>;

interface JupyterOutput {
    output_type: "stream" | "display_data" | "execute_result" | "error";
    name?: string;
    text?: string | string[];
    data?: OutputData;
    ename?: string;
    evalue?: string;
    traceback?: string[];
    execution_count?: number | null;
}

// ── Helper ───────────────────────────────────────────────────────────────────

function joinLines(v: string | string[] | undefined): string {
    if (!v) return "";
    return Array.isArray(v) ? v.join("") : v;
}

// Strip ANSI colour escape codes that appear in tracebacks
function stripAnsi(s: string): string {
    // eslint-disable-next-line no-control-regex
    return s.replace(/\x1b\[[0-9;]*[mGKHF]/g, "");
}

/**
 * Resolves `attachment:<filename>` image references in markdown source
 * to inline base64 data URIs using the cell's attachments map.
 *
 * Jupyter spec:
 *   cell.attachments = { "figure.png": { "image/png": "<base64>" } }
 *   markdown ref:      ![alt](attachment:figure.png)
 */
function resolveAttachments(
    source: string,
    attachments: CellAttachments | undefined
): string {
    if (!attachments) return source;

    return source.replace(
        /!\[([^\]]*)\]\(attachment:([^)]+)\)/g,
        (_match, alt, filename) => {
            const mimeMap = attachments[filename];
            if (!mimeMap) return _match;

            // Prefer PNG → JPEG → GIF → SVG → first available
            const mime =
                ["image/png", "image/jpeg", "image/gif", "image/svg+xml"].find(
                    (m) => mimeMap[m]
                ) ?? Object.keys(mimeMap)[0];

            if (!mime || !mimeMap[mime]) return _match;

            const b64raw = mimeMap[mime];
            const b64 = (
                Array.isArray(b64raw) ? b64raw.join("") : b64raw
            ).replace(/\s/g, "");

            return `![${alt}](data:${mime};base64,${b64})`;
        }
    );
}

// ── View ─────────────────────────────────────────────────────────────────────

class JupyterView extends FileView {
    private component: Component;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
        this.component = new Component();
    }

    getViewType(): string {
        return JUPYTER_VIEW_TYPE;
    }

    getDisplayText(): string {
        return this.file?.name ?? "Jupyter Notebook";
    }

    getIcon(): string {
        return "file-code";
    }

    // Read-only: do not allow editing
    canAcceptExtension(extension: string): boolean {
        return extension === JUPYTER_EXTENSION;
    }

    async onLoadFile(file: TFile): Promise<void> {
        this.component.load();
        const raw = await this.app.vault.read(file);
        this.render(raw);
    }

    async onUnloadFile(file: TFile): Promise<void> {
        this.component.unload();
        this.contentEl.empty();
        return super.onUnloadFile(file);
    }

    // ── Rendering entry point ────────────────────────────────────────────────

    private render(raw: string): void {
        this.contentEl.empty();
        this.contentEl.addClass("jupyter-notebook-view");

        let nb: JupyterNotebook;
        try {
            nb = JSON.parse(raw) as JupyterNotebook;
        } catch {
            this.contentEl.createEl("p", {
                text: "Could not parse notebook JSON.",
                cls: "jupyter-parse-error",
            });
            return;
        }

        // Support both nbformat 3 (worksheets) and nbformat 4 (cells)
        const cells: JupyterCell[] =
            nb.cells ?? nb.worksheets?.[0]?.cells ?? [];

        const wrapper = this.contentEl.createDiv({ cls: "jupyter-notebook" });

        this.renderHeader(wrapper, nb.metadata);

        for (const cell of cells) {
            this.renderCell(wrapper, cell, nb.metadata);
        }
    }

    private renderHeader(container: HTMLElement, meta: NotebookMetadata): void {
        if (!meta?.kernelspec?.display_name && !meta?.language_info?.name) return;

        const header = container.createDiv({ cls: "jupyter-nb-header" });
        const lang =
            meta.kernelspec?.display_name ??
            meta.language_info?.name ??
            "unknown";
        const version = meta.language_info?.version
            ? ` ${meta.language_info.version}`
            : "";
        header.createEl("span", {
            text: `Kernel: ${lang}${version}`,
            cls: "jupyter-kernel-badge",
        });
    }

    // ── Cell rendering ───────────────────────────────────────────────────────

    private renderCell(
        container: HTMLElement,
        cell: JupyterCell,
        meta: NotebookMetadata
    ): void {
        const source = joinLines(cell.source);

        const wrap = container.createDiv({
            cls: `jupyter-cell jupyter-cell-${cell.cell_type}`,
        });

        if (cell.cell_type === "markdown") {
            this.renderMarkdownCell(wrap, source, cell.attachments);
        } else if (cell.cell_type === "code") {
            this.renderCodeCell(wrap, cell, source, meta);
        } else {
            // raw
            this.renderRawCell(wrap, source);
        }
    }

    private renderMarkdownCell(
        wrap: HTMLElement,
        source: string,
        attachments: CellAttachments | undefined
    ): void {
        // Replace attachment: references with inline base64 data URIs
        // before handing the source to Obsidian's markdown renderer
        const resolvedSource = resolveAttachments(source, attachments);

        const content = wrap.createDiv({ cls: "jupyter-cell-content" });
        MarkdownRenderer.render(
            this.app,
            resolvedSource,
            content,
            this.file?.path ?? "",
            this.component
        );
    }

    private renderCodeCell(
        wrap: HTMLElement,
        cell: JupyterCell,
        source: string,
        meta: NotebookMetadata
    ): void {
        const row = wrap.createDiv({ cls: "jupyter-code-row" });

        // Gutter with execution count
        const gutter = row.createDiv({ cls: "jupyter-gutter" });
        gutter.createEl("span", {
            text:
                cell.execution_count != null
                    ? `[${cell.execution_count}]:`
                    : "[ ]:",
            cls: "jupyter-exec-count",
        });

        const right = row.createDiv({ cls: "jupyter-code-right" });

        const lang =
            meta?.language_info?.name ??
            meta?.kernelspec?.language ??
            "python";

        const fence = right.createDiv({ cls: "jupyter-cell-source" });
        MarkdownRenderer.render(
            this.app,
            "```" + lang + "\n" + source + "\n```",
            fence,
            this.file?.path ?? "",
            this.component
        );

        // Inject line numbers after Obsidian renders the code block
        this.injectLineNumbers(fence, source);

        // Outputs
        if (cell.outputs && cell.outputs.length > 0) {
            const outputsWrap = wrap.createDiv({ cls: "jupyter-outputs" });
            for (const out of cell.outputs) {
                this.renderOutput(outputsWrap, out);
            }
        }
    }

    /**
     * Injects a line-number gutter into the <pre><code> block rendered by
     * Obsidian's MarkdownRenderer. Uses a CSS counter approach via a
     * wrapper element so the gutter always spans the full code height.
     */
    private injectLineNumbers(fence: HTMLElement, source: string): void {
        // Wait for Obsidian to finish rendering the fenced block
        setTimeout(() => {
            const pre = fence.querySelector("pre");
            const code = pre?.querySelector("code");
            if (!pre || !code) return;

            // Avoid double-injection
            if (pre.classList.contains("jupyter-ln-injected")) return;
            pre.classList.add("jupyter-ln-injected");

            const lines = source.split("\n");

            // Build the line-number column as a series of <span> elements,
            // one per line, so height is always in sync with the code content
            const lineNumbers = document.createElement("span");
            lineNumbers.className = "jupyter-line-numbers";
            lineNumbers.setAttribute("aria-hidden", "true");

            lines.forEach((_, i) => {
                const ln = document.createElement("span");
                ln.className = "jupyter-ln";
                ln.textContent = String(i + 1);
                lineNumbers.appendChild(ln);
            });

            // Wrap pre content: line-numbers column + existing code
            pre.style.display = "flex";
            pre.style.padding = "0";
            pre.insertBefore(lineNumbers, code);
        }, 0);
    }

    private renderRawCell(wrap: HTMLElement, source: string): void {
        const pre = wrap.createEl("pre", { cls: "jupyter-raw-cell" });
        pre.createEl("code", { text: source });
    }

    // ── Output rendering ─────────────────────────────────────────────────────

    private renderOutput(container: HTMLElement, out: JupyterOutput): void {
        const el = container.createDiv({
            cls: `jupyter-output jupyter-output-${out.output_type}`,
        });

        switch (out.output_type) {
            case "stream":
                this.renderStream(el, out);
                break;
            case "error":
                this.renderError(el, out);
                break;
            case "display_data":
            case "execute_result":
                if (out.execution_count != null) {
                    el.createEl("span", {
                        text: `[${out.execution_count}]:`,
                        cls: "jupyter-output-exec-count",
                    });
                }
                this.renderMimeData(el, out.data ?? {});
                break;
        }
    }

    private renderStream(el: HTMLElement, out: JupyterOutput): void {
        const text = joinLines(out.text);
        const pre = el.createEl("pre", {
            cls: out.name === "stderr" ? "jupyter-stderr" : "jupyter-stdout",
        });
        pre.createEl("code", { text });
    }

    private renderError(el: HTMLElement, out: JupyterOutput): void {
        const traceback = out.traceback?.length
            ? out.traceback.join("\n")
            : `${out.ename ?? "Error"}: ${out.evalue ?? ""}`;
        const pre = el.createEl("pre", { cls: "jupyter-traceback" });
        pre.createEl("code", { text: stripAnsi(traceback) });
    }

    private renderMimeData(el: HTMLElement, data: OutputData): void {
        // Render the richest available MIME type
        const getText = (v: string | string[]) =>
            Array.isArray(v) ? v.join("") : v;

        if (data["image/png"]) {
            const img = el.createEl("img", { cls: "jupyter-output-image" });
            img.src = `data:image/png;base64,${getText(data["image/png"]).replace(/\s/g, "")}`;
        } else if (data["image/jpeg"]) {
            const img = el.createEl("img", { cls: "jupyter-output-image" });
            img.src = `data:image/jpeg;base64,${getText(data["image/jpeg"]).replace(/\s/g, "")}`;
        } else if (data["image/svg+xml"]) {
            const wrapper = el.createDiv({ cls: "jupyter-output-svg" });
            wrapper.innerHTML = getText(data["image/svg+xml"]);
        } else if (data["text/html"]) {
            const wrapper = el.createDiv({ cls: "jupyter-output-html" });
            wrapper.innerHTML = getText(data["text/html"]);
        } else if (data["text/markdown"]) {
            const div = el.createDiv({ cls: "jupyter-output-markdown" });
            MarkdownRenderer.render(
                this.app,
                getText(data["text/markdown"]),
                div,
                this.file?.path ?? "",
                this.component
            );
        } else if (data["text/plain"]) {
            el.createEl("pre", { cls: "jupyter-output-text" }).createEl(
                "code",
                { text: getText(data["text/plain"]) }
            );
        }
    }
}

// ── Plugin ───────────────────────────────────────────────────────────────────

export default class JupyterPlugin extends Plugin {
    async onload(): Promise<void> {
        this.registerView(
            JUPYTER_VIEW_TYPE,
            (leaf: WorkspaceLeaf) => new JupyterView(leaf)
        );

        this.registerExtensions([JUPYTER_EXTENSION], JUPYTER_VIEW_TYPE);

        this.addCommand({
            id: "export-jupyter-to-pdf",
            name: "Export Jupyter Notebook to PDF",
            checkCallback: (checking: boolean) => {
                const view = this.app.workspace.getActiveViewOfType(JupyterView);
                if (view) {
                    if (!checking) {
                        this.exportToPdf(view);
                    }
                    return true;
                }
                return false;
            },
        });
    }

    private exportToPdf(view: JupyterView): void {
        const app = this.app as any;

        // Get the notebook's rendered HTML content
        const contentEl = view.contentEl as HTMLElement;
        const notebookEl = contentEl.querySelector(".jupyter-notebook") as HTMLElement;
        if (!notebookEl) {
            console.error("Jupyter PDF export: notebook element not found");
            return;
        }

        // Collect only the plugin's own stylesheet (styles.css)
        const styles = Array.from(document.styleSheets)
            .filter(sheet => sheet.href?.includes("jupyter-notebook-viewer") || !sheet.href)
            .map(sheet => {
                try {
                    return Array.from(sheet.cssRules).map(r => r.cssText).join("\n");
                } catch {
                    return "";
                }
            })
            .join("\n");

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { margin: 20px; background: white; color: black; font-family: sans-serif; font-size: 14px; }
    .jupyter-notebook { max-width: 100%; }
    pre, code { font-family: monospace; font-size: 13px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
    th { background: #f0f0f0; font-weight: 600; }
    ${styles}
  </style>
</head>
<body>
  ${notebookEl.outerHTML}
</body>
</html>`;

        const remote = (window as any).require?.("@electron/remote") ??
                       (window as any).require?.("electron")?.remote;

        if (!remote) {
            console.error("Jupyter PDF export: @electron/remote not available");
            return;
        }

        const { BrowserWindow, dialog, shell } = remote;
        const fs   = (window as any).require("fs");
        const path = (window as any).require("path");
        const os   = (window as any).require("os");

        // Write HTML to a temp file to avoid data: URL length limits
        const tmpFile = path.join(os.tmpdir(), "jupyter-export-" + Date.now() + ".html");
        fs.writeFileSync(tmpFile, html, "utf-8");

        const win = new BrowserWindow({
            show: false,
            webPreferences: { nodeIntegration: false, contextIsolation: true },
        });

        win.loadFile(tmpFile);

        win.webContents.once("did-finish-load", () => {
            // Small delay to let any layout settle
            setTimeout(() => {
                win.webContents.printToPDF({
                    printBackground: true,
                    marginsType: 0,
                    pageSize: "A4",
                }).then((data: Buffer) => {
                    win.close();
                    fs.unlinkSync(tmpFile);

                    const defaultPath = path.join(
                        app.vault.adapter.basePath ?? os.homedir(),
                        (view.file?.basename ?? "notebook") + ".pdf"
                    );

                    const currentWin = remote.getCurrentWindow();
                    dialog.showSaveDialog(currentWin, {
                        defaultPath,
                        filters: [{ name: "PDF", extensions: ["pdf"] }],
                    }).then(({ filePath, canceled }: { filePath: string; canceled: boolean }) => {
                        if (!canceled && filePath) {
                            fs.writeFile(filePath, data, (err: Error | null) => {
                                if (err) {
                                    console.error("Jupyter PDF write error:", err);
                                } else {
                                    shell.showItemInFolder(filePath);
                                }
                            });
                        }
                    });
                }).catch((err: Error) => {
                    win.close();
                    try { fs.unlinkSync(tmpFile); } catch {}
                    console.error("Jupyter PDF export failed:", err);
                });
            }, 500);
        });
    }

    async onunload(): Promise<void> {
        this.app.workspace.detachLeavesOfType(JUPYTER_VIEW_TYPE);
    }
}
