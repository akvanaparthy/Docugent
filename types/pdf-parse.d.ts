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
    buffer: Buffer | ArrayBufferLike,
    options?: any
  ): Promise<PDFData>;
  export = pdf;
}
