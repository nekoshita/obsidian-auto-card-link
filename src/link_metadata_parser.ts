import { LinkMetadata } from "src/interfaces";

export class LinkMetadataParser {
  url: string;
  htmlDoc: Document;

  constructor(url: string, htmlText: string) {
    this.url = url;

    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(htmlText, "text/html");
    this.htmlDoc = htmlDoc;
  }

  parse(): LinkMetadata | undefined {
    const title = this.getTitle()
      ?.replace(/\r\n|\n|\r/g, "")
      .replace(/"/g, '\\"')
      .trim();
    if (!title) return;

    const description = this.getDescription()
      ?.replace(/\r\n|\n|\r/g, "")
      .replace(/"/g, '\\"')
      .trim();
    const { hostname } = new URL(this.url);
    const favicon = this.getFavicon();
    const image = this.getImage();

    return {
      url: this.url,
      title: title,
      description: description,
      host: hostname,
      favicon: favicon,
      image: image,
      indent: 0,
    };
  }

  private getTitle(): string | undefined {
    const ogTitle = this.htmlDoc
      .querySelector("meta[property='og:title']")
      ?.getAttr("content");
    if (ogTitle) return ogTitle;

    const title = this.htmlDoc.querySelector("title")?.textContent;
    if (title) return title;
  }

  private getDescription(): string | undefined {
    const ogDescription = this.htmlDoc
      .querySelector("meta[property='og:description']")
      ?.getAttr("content");
    if (ogDescription) return ogDescription;

    const metaDescription = this.htmlDoc
      .querySelector("meta[name='description']")
      ?.getAttr("content");
    if (metaDescription) return metaDescription;
  }

  private getFavicon(): string | undefined {
    const favicon = this.htmlDoc
      .querySelector("link[rel='icon']")
      ?.getAttr("href");
    if (favicon) return favicon;
  }

  private getImage(): string | undefined {
    const ogImage = this.htmlDoc
      .querySelector("meta[property='og:image']")
      ?.getAttr("content");
    if (ogImage) return ogImage;
  }
}
