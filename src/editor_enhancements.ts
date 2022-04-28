import { Editor, EditorPosition } from "obsidian";

import { linkLineRegex, lineRegex } from "src/regex";

interface WordBoundaries {
  start: { line: number; ch: number };
  end: { line: number; ch: number };
}

export class EditorExtensions {
  public static getSelectedText(editor: Editor): string {
    if (!editor.somethingSelected()) {
      const wordBoundaries = this.getWordBoundaries(editor);
      editor.setSelection(wordBoundaries.start, wordBoundaries.end);
    }
    return editor.getSelection();
  }

  private static isCursorWithinBoundaries(
    cursor: EditorPosition,
    match: RegExpMatchArray
  ): boolean {
    const startIndex = match.index ?? 0;
    const endIndex = startIndex + match[0].length;
    return startIndex <= cursor.ch && cursor.ch <= endIndex;
  }

  private static getWordBoundaries(editor: Editor): WordBoundaries {
    const cursor = editor.getCursor();

    // If its a normal URL token this is not a markdown link
    // In this case we can simply overwrite the link boundaries as-is
    const lineText = editor.getLine(cursor.line);
    // First check if we're in a link
    const linksInLine = lineText.matchAll(linkLineRegex);

    for (const match of linksInLine) {
      if (this.isCursorWithinBoundaries(cursor, match)) {
        const startCh = match.index ?? 0;
        return {
          start: {
            line: cursor.line,
            ch: startCh,
          },
          end: { line: cursor.line, ch: startCh + match[0].length },
        };
      }
    }

    // If not, check if we're in just a standard ol' URL.
    const urlsInLine = lineText.matchAll(lineRegex);

    for (const match of urlsInLine) {
      if (this.isCursorWithinBoundaries(cursor, match)) {
        const startCh = match.index ?? 0;
        return {
          start: { line: cursor.line, ch: startCh },
          end: { line: cursor.line, ch: startCh + match[0].length },
        };
      }
    }

    return {
      start: cursor,
      end: cursor,
    };
  }

  public static getEditorPositionFromIndex(
    content: string,
    index: number
  ): EditorPosition {
    const substr = content.substr(0, index);

    let l = 0;
    let offset = -1;
    let r = -1;
    for (; (r = substr.indexOf("\n", r + 1)) !== -1; l++, offset = r);
    offset += 1;

    const ch = content.substr(offset, index - offset).length;

    return { line: l, ch: ch };
  }
}
