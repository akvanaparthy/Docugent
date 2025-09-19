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
    _buffer: Buffer | { buffer: Buffer },
    _options?: MammothOptions
  ): Promise<MammothResult>;
  function extractRawText(
    _buffer: Buffer | { buffer: Buffer },
    _options?: MammothOptions
  ): Promise<MammothResult>;

  export = {
    convertToHtml,
    extractRawText,
  };
}
