var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => JupyterExplorerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var JUPYTER_VIEW_TYPE = "jupyter-notebook-view";
var JUPYTER_EXTENSION = "ipynb";
function joinLines(v) {
  if (!v) return "";
  return Array.isArray(v) ? v.join("") : v;
}
function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*[mGKHF]/g, "");
}
function resolveAttachments(source, attachments) {
  if (!attachments) return source;
  return source.replace(
    /!\[([^\]]*)\]\(attachment:([^)]+)\)/g,
    (_match, alt, filename) => {
      var _a;
      const mimeMap = attachments[filename];
      if (!mimeMap) return _match;
      const mime = (_a = ["image/png", "image/jpeg", "image/gif", "image/svg+xml"].find(
        (m) => mimeMap[m]
      )) != null ? _a : Object.keys(mimeMap)[0];
      if (!mime || !mimeMap[mime]) return _match;
      const b64raw = mimeMap[mime];
      const b64 = (Array.isArray(b64raw) ? b64raw.join("") : b64raw).replace(/\s/g, "");
      return `![${alt}](data:${mime};base64,${b64})`;
    }
  );
}
var JupyterExplorerView = class extends import_obsidian.FileView {
  constructor(leaf) {
    super(leaf);
    this.component = new import_obsidian.Component();
  }
  getViewType() {
    return JUPYTER_VIEW_TYPE;
  }
  getDisplayText() {
    var _a, _b;
    return (_b = (_a = this.file) == null ? void 0 : _a.name) != null ? _b : "Jupyter Explorer";
  }
  getIcon() {
    return "file-code";
  }
  // Read-only: do not allow editing
  canAcceptExtension(extension) {
    return extension === JUPYTER_EXTENSION;
  }
  async onLoadFile(file) {
    this.component.load();
    const raw = await this.app.vault.read(file);
    this.render(raw);
  }
  async onUnloadFile(file) {
    this.component.unload();
    this.contentEl.empty();
    return super.onUnloadFile(file);
  }
  // ── Rendering entry point ────────────────────────────────────────────────
  render(raw) {
    var _a, _b, _c, _d;
    this.contentEl.empty();
    this.contentEl.addClass("jupyter-notebook-view");
    let nb;
    try {
      nb = JSON.parse(raw);
    } catch (e) {
      this.contentEl.createEl("p", {
        text: "Could not parse notebook JSON.",
        cls: "jupyter-parse-error"
      });
      return;
    }
    const cells = (_d = (_c = nb.cells) != null ? _c : (_b = (_a = nb.worksheets) == null ? void 0 : _a[0]) == null ? void 0 : _b.cells) != null ? _d : [];
    const wrapper = this.contentEl.createDiv({ cls: "jupyter-notebook" });
    this.renderHeader(wrapper, nb.metadata);
    for (const cell of cells) {
      this.renderCell(wrapper, cell, nb.metadata);
    }
  }
  renderHeader(container, meta) {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!((_a = meta == null ? void 0 : meta.kernelspec) == null ? void 0 : _a.display_name) && !((_b = meta == null ? void 0 : meta.language_info) == null ? void 0 : _b.name)) return;
    const header = container.createDiv({ cls: "jupyter-nb-header" });
    const lang = (_f = (_e = (_c = meta.kernelspec) == null ? void 0 : _c.display_name) != null ? _e : (_d = meta.language_info) == null ? void 0 : _d.name) != null ? _f : "unknown";
    const version = ((_g = meta.language_info) == null ? void 0 : _g.version) ? ` ${meta.language_info.version}` : "";
    header.createEl("span", {
      text: `Kernel: ${lang}${version}`,
      cls: "jupyter-kernel-badge"
    });
  }
  // ── Cell rendering ───────────────────────────────────────────────────────
  renderCell(container, cell, meta) {
    const source = joinLines(cell.source);
    const wrap = container.createDiv({
      cls: `jupyter-cell jupyter-cell-${cell.cell_type}`
    });
    if (cell.cell_type === "markdown") {
      this.renderMarkdownCell(wrap, source, cell.attachments);
    } else if (cell.cell_type === "code") {
      this.renderCodeCell(wrap, cell, source, meta);
    } else {
      this.renderRawCell(wrap, source);
    }
  }
  renderMarkdownCell(wrap, source, attachments) {
    var _a, _b;
    const resolvedSource = resolveAttachments(source, attachments);
    const content = wrap.createDiv({ cls: "jupyter-cell-content" });
    import_obsidian.MarkdownRenderer.render(
      this.app,
      resolvedSource,
      content,
      (_b = (_a = this.file) == null ? void 0 : _a.path) != null ? _b : "",
      this.component
    );
  }
  renderCodeCell(wrap, cell, source, meta) {
    var _a, _b, _c, _d, _e, _f;
    const row = wrap.createDiv({ cls: "jupyter-code-row" });
    const gutter = row.createDiv({ cls: "jupyter-gutter" });
    gutter.createEl("span", {
      text: cell.execution_count != null ? `[${cell.execution_count}]:` : "[ ]:",
      cls: "jupyter-exec-count"
    });
    const right = row.createDiv({ cls: "jupyter-code-right" });
    const lang = (_d = (_c = (_a = meta == null ? void 0 : meta.language_info) == null ? void 0 : _a.name) != null ? _c : (_b = meta == null ? void 0 : meta.kernelspec) == null ? void 0 : _b.language) != null ? _d : "python";
    const fence = right.createDiv({ cls: "jupyter-cell-source" });
    import_obsidian.MarkdownRenderer.render(
      this.app,
      "```" + lang + "\n" + source + "\n```",
      fence,
      (_f = (_e = this.file) == null ? void 0 : _e.path) != null ? _f : "",
      this.component
    );
    this.injectLineNumbers(fence, source);
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
  injectLineNumbers(fence, source) {
    setTimeout(() => {
      const pre = fence.querySelector("pre");
      const code = pre == null ? void 0 : pre.querySelector("code");
      if (!pre || !code) return;
      if (pre.classList.contains("jupyter-ln-injected")) return;
      pre.classList.add("jupyter-ln-injected");
      const lines = source.split("\n");
      const lineNumbers = document.createElement("span");
      lineNumbers.className = "jupyter-line-numbers";
      lineNumbers.setAttribute("aria-hidden", "true");
      lines.forEach((_, i) => {
        const ln = document.createElement("span");
        ln.className = "jupyter-ln";
        ln.textContent = String(i + 1);
        lineNumbers.appendChild(ln);
      });
      pre.style.display = "flex";
      pre.style.padding = "0";
      pre.insertBefore(lineNumbers, code);
    }, 0);
  }
  renderRawCell(wrap, source) {
    const pre = wrap.createEl("pre", { cls: "jupyter-raw-cell" });
    pre.createEl("code", { text: source });
  }
  // ── Output rendering ─────────────────────────────────────────────────────
  renderOutput(container, out) {
    var _a;
    const el = container.createDiv({
      cls: `jupyter-output jupyter-output-${out.output_type}`
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
            cls: "jupyter-output-exec-count"
          });
        }
        this.renderMimeData(el, (_a = out.data) != null ? _a : {});
        break;
    }
  }
  renderStream(el, out) {
    const text = joinLines(out.text);
    const pre = el.createEl("pre", {
      cls: out.name === "stderr" ? "jupyter-stderr" : "jupyter-stdout"
    });
    pre.createEl("code", { text });
  }
  renderError(el, out) {
    var _a, _b, _c;
    const traceback = ((_a = out.traceback) == null ? void 0 : _a.length) ? out.traceback.join("\n") : `${(_b = out.ename) != null ? _b : "Error"}: ${(_c = out.evalue) != null ? _c : ""}`;
    const pre = el.createEl("pre", { cls: "jupyter-traceback" });
    pre.createEl("code", { text: stripAnsi(traceback) });
  }
  renderMimeData(el, data) {
    var _a, _b;
    const getText = (v) => Array.isArray(v) ? v.join("") : v;
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
      import_obsidian.MarkdownRenderer.render(
        this.app,
        getText(data["text/markdown"]),
        div,
        (_b = (_a = this.file) == null ? void 0 : _a.path) != null ? _b : "",
        this.component
      );
    } else if (data["text/plain"]) {
      el.createEl("pre", { cls: "jupyter-output-text" }).createEl(
        "code",
        { text: getText(data["text/plain"]) }
      );
    }
  }
};
var JupyterExplorerPlugin = class extends import_obsidian.Plugin {
  async onload() {
    this.registerView(
      JUPYTER_VIEW_TYPE,
      (leaf) => new JupyterExplorerView(leaf)
    );
    this.registerExtensions([JUPYTER_EXTENSION], JUPYTER_VIEW_TYPE);
    this.addCommand({
      id: "export-jupyter-to-pdf",
      name: "Export Jupyter Explorer notebook to PDF",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(JupyterExplorerView);
        if (view) {
          if (!checking) {
            this.exportToPdf(view);
          }
          return true;
        }
        return false;
      }
    });
  }
  exportToPdf(view) {
    var _a, _b, _c, _d;
    const app = this.app;
    const contentEl = view.contentEl;
    const notebookEl = contentEl.querySelector(".jupyter-notebook");
    if (!notebookEl) {
      console.error("Jupyter Explorer PDF export: notebook element not found");
      return;
    }
    const styles = Array.from(document.styleSheets).filter((sheet) => {
      var _a2;
      return ((_a2 = sheet.href) == null ? void 0 : _a2.includes("jupyter-notebook-viewer")) || !sheet.href;
    }).map((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((r) => r.cssText).join("\n");
      } catch (e) {
        return "";
      }
    }).join("\n");
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
    const remote = (_d = (_a = window.require) == null ? void 0 : _a.call(window, "@electron/remote")) != null ? _d : (_c = (_b = window.require) == null ? void 0 : _b.call(window, "electron")) == null ? void 0 : _c.remote;
    if (!remote) {
      console.error("Jupyter Explorer PDF export: @electron/remote not available");
      return;
    }
    const { BrowserWindow, dialog, shell } = remote;
    const fs = window.require("fs");
    const path = window.require("path");
    const os = window.require("os");
    const tmpFile = path.join(os.tmpdir(), "jupyter-export-" + Date.now() + ".html");
    fs.writeFileSync(tmpFile, html, "utf-8");
    const win = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });
    win.loadFile(tmpFile);
    win.webContents.once("did-finish-load", () => {
      setTimeout(() => {
        win.webContents.printToPDF({
          printBackground: true,
          marginsType: 0,
          pageSize: "A4"
        }).then((data) => {
          var _a2, _b2, _c2;
          win.close();
          fs.unlinkSync(tmpFile);
          const defaultPath = path.join(
            (_a2 = app.vault.adapter.basePath) != null ? _a2 : os.homedir(),
            ((_c2 = (_b2 = view.file) == null ? void 0 : _b2.basename) != null ? _c2 : "notebook") + ".pdf"
          );
          const currentWin = remote.getCurrentWindow();
          dialog.showSaveDialog(currentWin, {
            defaultPath,
            filters: [{ name: "PDF", extensions: ["pdf"] }]
          }).then(({ filePath, canceled }) => {
            if (!canceled && filePath) {
              fs.writeFile(filePath, data, (err) => {
                if (err) {
                  console.error("Jupyter Explorer PDF write error:", err);
                } else {
                  shell.showItemInFolder(filePath);
                }
              });
            }
          });
        }).catch((err) => {
          win.close();
          try {
            fs.unlinkSync(tmpFile);
          } catch (e) {
          }
          console.error("Jupyter Explorer PDF export failed:", err);
        });
      }, 500);
    });
  }
  async onunload() {
    this.app.workspace.detachLeavesOfType(JUPYTER_VIEW_TYPE);
  }
};
