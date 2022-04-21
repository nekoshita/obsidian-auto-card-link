import { Plugin, MarkdownView, Editor } from "obsidian";

import {
  ObsidianAutoCardLinkSettings,
  ObsidianAutoCardLinkSettingTab,
  DEFAULT_SETTINGS,
} from "src/settings";
import { EditorExtensions } from "src/editor_enhancements";
import { CheckIf } from "src/checkif";
import { CodeBlockGenerator } from "src/code_block_generator";
import { CodeBlockProcessor } from "src/code_block_processor";

interface PasteFunction {
  (this: HTMLElement, ev: ClipboardEvent): void;
}

export default class ObsidianAutoCardLink extends Plugin {
  settings?: ObsidianAutoCardLinkSettings;
  pasteFunction?: PasteFunction;

  async onload() {
    await this.loadSettings();

    this.registerMarkdownCodeBlockProcessor("cardlink", async (source, el) => {
      const processor = new CodeBlockProcessor(this.app);
      await processor.run(source, el);
    });

    this.pasteFunction = this.pasteAndEnhanceURL.bind(this);

    this.addCommand({
      id: "auto-card-link-paste-and-enhance",
      name: "Paste URL and enhance to card link",
      editorCallback: async (editor: Editor) => {
        await this.manualPasteAndEnhanceURL(editor);
      },
      hotkeys: [],
    });

    this.addCommand({
      id: "auto-card-link-enhance-selected-url",
      name: "Enhance selected URL to card link",
      editorCheckCallback: (checking: boolean, editor: Editor) => {
        // if offline, not showing command
        if (!navigator.onLine) return false;

        if (checking) return true;

        this.enhanceSelectedURL(editor);
      },
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: "e",
        },
      ],
    });

    this.registerEvent(
      this.app.workspace.on("editor-paste", this.pasteFunction)
    );

    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu) => {
        // if showInMenuItem setting is false, now showing menu item
        if (!this.settings?.showInMenuItem) return;

        menu.addItem((item) => {
          item
            .setTitle("Paste URL and enhance to card link")
            .setIcon("paste")
            .onClick(async () => {
              const editor = this.getEditor();
              if (!editor) return;
              this.manualPasteAndEnhanceURL(editor);
            });
        });

        // if offline, not showing "Enhance selected URL to card link" item
        if (!navigator.onLine) return;

        menu.addItem((item) => {
          item
            .setTitle("Enhance selected URL to card link")
            .setIcon("link")
            .onClick(() => {
              const editor = this.getEditor();
              if (!editor) return;
              this.enhanceSelectedURL(editor);
            });
        });

        return;
      })
    );

    this.addSettingTab(new ObsidianAutoCardLinkSettingTab(this.app, this));
  }

  private enhanceSelectedURL(editor: Editor): void {
    const selectedText = (
      EditorExtensions.getSelectedText(editor) || ""
    ).trim();

    const codeBlockGenerator = new CodeBlockGenerator(editor);

    if (CheckIf.isUrl(selectedText)) {
      codeBlockGenerator.convertUrlToCodeBlock(selectedText);
    } else if (CheckIf.isLinkedUrl(selectedText)) {
      const url = this.getUrlFromLink(selectedText);
      codeBlockGenerator.convertUrlToCodeBlock(url);
    }
  }

  private async manualPasteAndEnhanceURL(editor: Editor): Promise<void> {
    // if no clipboardText, do nothing
    const clipboardText = await navigator.clipboard.readText();
    if (clipboardText == null || clipboardText == "") {
      return;
    }

    // if offline, just paste
    if (!navigator.onLine) {
      editor.replaceSelection(clipboardText);
      return;
    }

    // If not URL, just paste
    if (!CheckIf.isUrl(clipboardText) || CheckIf.isImage(clipboardText)) {
      editor.replaceSelection(clipboardText);
      return;
    }

    const codeBlockGenerator = new CodeBlockGenerator(editor);
    codeBlockGenerator.convertUrlToCodeBlock(clipboardText);
    return;
  }

  private async pasteAndEnhanceURL(clipboard: ClipboardEvent): Promise<void> {
    // if enhanceDefaultPaste is false, do nothing
    if (!this.settings?.enhanceDefaultPaste) return;

    // if offline, do nothing
    if (!navigator.onLine) return;

    const editor = this.getEditor();
    if (!editor) return;

    if (clipboard.clipboardData == null) return;

    const clipboardText = clipboard.clipboardData.getData("text/plain");
    if (clipboardText == null || clipboardText == "") return;

    // If its not a URL, we return false to allow the default paste handler to take care of it.
    // Similarly, image urls don't have a meaningful attribute so downloading it
    // to fetching metadata is a waste of bandwidth.
    if (!CheckIf.isUrl(clipboardText) || CheckIf.isImage(clipboardText)) {
      return;
    }

    // We've decided to handle the paste, stop propagation to the default handler.
    clipboard.stopPropagation();
    clipboard.preventDefault();

    const codeBlockGenerator = new CodeBlockGenerator(editor);
    codeBlockGenerator.convertUrlToCodeBlock(clipboardText);
    return;
  }

  private getEditor(): Editor | undefined {
    const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeLeaf == null) return;
    return activeLeaf.editor;
  }

  private getUrlFromLink(link: string): string {
    const urlRegex = new RegExp(DEFAULT_SETTINGS.linkRegex);
    const regExpExecArray = urlRegex.exec(link);
    if (regExpExecArray === null || regExpExecArray.length < 2) {
      return "";
    }
    return regExpExecArray[2];
  }

  onunload() {
    console.log("unloading auto-card-link");
  }

  private async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
