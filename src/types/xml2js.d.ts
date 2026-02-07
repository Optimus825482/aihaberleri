/**
 * Type declarations for xml2js module
 * This provides basic type support for RSS parsing operations
 */

declare module "xml2js" {
  export interface ParserOptions {
    explicitArray?: boolean;
    ignoreAttrs?: boolean;
    trim?: boolean;
    normalize?: boolean;
    explicitRoot?: boolean;
    emptyTag?: string | (() => any);
    strict?: boolean;
    normalizeTags?: boolean;
    attrkey?: string;
    charkey?: string;
    attrNameProcessors?: ((name: string) => string)[];
    attrValueProcessors?: ((value: string) => string)[];
    tagNameProcessors?: ((name: string) => string)[];
    valueProcessors?: ((value: string) => string)[];
  }

  export interface BuilderOptions {
    rootName?: string;
    renderOpts?: {
      pretty?: boolean;
      indent?: string;
      newline?: string;
    };
    headless?: boolean;
    cdata?: boolean;
  }

  export class Parser {
    constructor(options?: ParserOptions);
    parseString(
      str: string,
      callback: (err: Error | null, result: any) => void
    ): void;
    parseStringPromise(str: string): Promise<any>;
    reset(): void;
  }

  export class Builder {
    constructor(options?: BuilderOptions);
    buildObject(obj: any): string;
  }

  export function parseString(
    str: string,
    callback: (err: Error | null, result: any) => void
  ): void;

  export function parseString(
    str: string,
    options: ParserOptions,
    callback: (err: Error | null, result: any) => void
  ): void;

  export function parseStringPromise(
    str: string,
    options?: ParserOptions
  ): Promise<any>;
}
