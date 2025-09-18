declare module "mammoth" {
  interface MammothResult {
    value: string;
    messages: any[];
  }

  interface MammothOptions {
    styleMap?: string[];
    includeEmbeddedStyleMap?: boolean;
    includeDefaultStyleMap?: boolean;
    convertImage?: any;
    ignoreEmptyParagraphs?: boolean;
    idPrefix?: string;
  }

  function convertToHtml(
    buffer: Buffer | { buffer: Buffer },
    options?: MammothOptions
  ): Promise<MammothResult>;
  function extractRawText(
    buffer: Buffer | { buffer: Buffer },
    options?: MammothOptions
  ): Promise<MammothResult>;

  export = {
    convertToHtml,
    extractRawText,
  };
}
