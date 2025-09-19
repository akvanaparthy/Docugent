declare module "pdf-parse" {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }

  function pdf(
    _buffer: Buffer | ArrayBufferLike,
    _options?: any
  ): Promise<PDFData>;
  export = pdf;
}
