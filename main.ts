import { EditorExtensions } from "./editor-enhancements";
import { Plugin, MarkdownView, Editor, Notice } from "obsidian";
import {
  ObsidianOGPSettings,
  ObsidianOGPSettingTab,
  DEFAULT_SETTINGS,
} from "settings";
import { CheckIf } from "checkif";
import { ogpLinkProcessor } from "ogp_link_processor";
import { linkMetadata } from "interfaces";

interface PasteFunction {
  (this: HTMLElement, ev: ClipboardEvent): void;
}

export default class ObsidianOGP extends Plugin {
  settings?: ObsidianOGPSettings;
  pasteFunction?: PasteFunction;

  async onload() {
    console.log("loading obsidian-ogp");
    await this.loadSettings();

    // for ogp_link rendering
    this.registerMarkdownCodeBlockProcessor("ogplink", async (source, el) => {
      const processor = new ogpLinkProcessor(this.app);
      await processor.run(source, el);
    });

    // Listen to paste event
    this.pasteFunction = this.pasteUrlByIframe.bind(this);

    this.addCommand({
      id: "obsidian-ogp-paste-and-enhance",
      name: "Paste URL and enhance with OGP metadata",
      callback: () => {
        this.manualPasteUrlByIframe();
      },
      hotkeys: [],
    });

    this.addCommand({
      id: "obsidian-ogp-enhance-existing-url",
      name: "Enhance existing URL with OGP metadata",
      callback: () => this.addOGPMetadataToLink(),
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
        if (!this.settings?.showInMenuItem) return;

        menu.addItem((item) => {
          item
            .setTitle("Paste URL and enhance")
            .setIcon("paste")
            .onClick(() => this.manualPasteUrlByIframe());
        });

        menu.addItem((item) => {
          item
            .setTitle("Enhance selected URL with OGP metadata")
            .setIcon("link")
            .onClick(() => this.addOGPMetadataToLink());
        });

        return;
      })
    );

    this.addSettingTab(new ObsidianOGPSettingTab(this.app, this));
  }

  addOGPMetadataToLink(): void {
    // Only attempt fetch if online
    if (!navigator.onLine) return;
    const editor = this.getEditor();
    if (!editor) return;
    const selectedText = (
      EditorExtensions.getSelectedText(editor) || ""
    ).trim();

    if (CheckIf.isUrl(selectedText)) {
      this.convertUrlToCodeBlock(editor, selectedText);
    } else if (CheckIf.isLinkedUrl(selectedText)) {
      const link = this.getUrlFromLink(selectedText);
      this.convertUrlToCodeBlock(editor, link);
    }
  }

  // Simulate standard paste but using editor.replaceSelection with clipboard text since we can't seem to dispatch a paste event.
  async manualPasteUrlByIframe(): Promise<void> {
    const editor = this.getEditor();
    if (!editor) return;

    const clipboardText = await navigator.clipboard.readText();
    if (clipboardText == null || clipboardText == "") return;

    // Only attempt fetch if online
    if (!navigator.onLine) {
      editor.replaceSelection(clipboardText);
      return;
    }

    // If its not a URL, we return false to allow the default paste handler to take care of it.
    // Similarly, image urls don't have a meaningful attribute so downloading it
    // to fetching metadata is a waste of bandwidth.
    if (!CheckIf.isUrl(clipboardText) || CheckIf.isImage(clipboardText)) {
      editor.replaceSelection(clipboardText);
      return;
    }

    this.convertUrlToCodeBlock(editor, clipboardText);
    return;
  }

  async pasteUrlByIframe(clipboard: ClipboardEvent): Promise<void> {
    if (!this.settings?.enhanceDefaultPaste) {
      return;
    }

    // Only attempt fetch if online
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

    this.convertUrlToCodeBlock(editor, clipboardText);
    return;
  }

  async convertUrlToCodeBlock(editor: Editor, url: string): Promise<void> {
    const selectedText = editor.getSelection();

    // Generate a unique id for find/replace operations.
    const pasteId = this.createBlockHash();
    const fetchingText = `[Fetching Data#${pasteId}](${url})`;

    // Instantly paste so you don't wonder if paste is broken
    editor.replaceSelection(fetchingText);

    const linkMetadata = await this.fetchLinkMetadata(url);

    const text = editor.getValue();
    const start = text.indexOf(fetchingText);

    if (start < 0) {
      console.log(
        `Unable to find text "${fetchingText}" in current editor, bailing out; link ${url}`
      );
      return;
    }

    const end = start + fetchingText.length;
    const startPos = EditorExtensions.getEditorPositionFromIndex(text, start);
    const endPos = EditorExtensions.getEditorPositionFromIndex(text, end);

    // if failed to link metadata, show notification and revert to selected text or url
    if (!linkMetadata) {
      new Notice("Couldn't fetch link metadata");
      editor.replaceRange(selectedText || url, startPos, endPos);
      return;
    }

    editor.replaceRange(
      `
\`\`\`ogplink
url: ${linkMetadata.url}
title: "${linkMetadata.title}"
description: "${linkMetadata.description}"
host: ${linkMetadata.host}
favicon: ${linkMetadata.favicon}
image: ${linkMetadata.image}
\`\`\`
`,
      startPos,
      endPos
    );
  }

  async fetchLinkMetadata(url: string): Promise<linkMetadata | undefined> {
    const data = await ajaxPromise({
      url: `http://iframely.server.crestify.com/iframely?url=${url}`,
    })
      .then((res) => {
        return JSON.parse(res);
      })
      .catch((error) => {
        console.log(error);
        return;
      });

    if (!data || data.links.length == 0 || !data.meta.title) {
      return;
    }

    const image = data.links[0].href || "";
    const favicon =
      data.links.find((link: { rel: string[] }) => {
        return link.rel.includes("icon");
      })?.href ?? "";
    const title = data.meta.title.replace(/"/g, '\\"');
    const description = (data.meta.description || "").replace(/"/g, '\\"');
    const { hostname } = new URL(url);

    return {
      url: url,
      title: title,
      description: description,
      host: hostname,
      favicon: favicon,
      image: image,
    };
  }

  private getEditor(): Editor | undefined {
    const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeLeaf == null) return;
    return activeLeaf.editor;
  }

  public getUrlFromLink(link: string): string {
    const urlRegex = new RegExp(DEFAULT_SETTINGS.linkRegex);
    const regExpExecArray = urlRegex.exec(link);
    if (regExpExecArray === null || regExpExecArray.length < 2) {
      return "";
    }
    return regExpExecArray[2];
  }

  // Custom hashid by @shabegom
  private createBlockHash(): string {
    let result = "";
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < 4; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  onunload() {
    console.log("unloading obsidian-ogp");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
