import { urlRegex, linkRegex, imageRegex } from "src/regex";

export class CheckIf {
  public static isUrl(text: string): boolean {
    const regex = new RegExp(urlRegex);
    return regex.test(text);
  }

  public static isImage(text: string): boolean {
    const regex = new RegExp(imageRegex);
    return regex.test(text);
  }

  public static isLinkedUrl(text: string): boolean {
    const regex = new RegExp(linkRegex);
    return regex.test(text);
  }
}
