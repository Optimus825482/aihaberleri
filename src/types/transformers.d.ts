/**
 * Type declarations for @xenova/transformers
 *
 * This provides TypeScript types for the transformers.js library.
 * The library doesn't ship with its own types.
 */

declare module "@xenova/transformers" {
  /**
   * Environment configuration
   */
  export const env: {
    /** Whether to use browser cache for models */
    useBrowserCache: boolean;
    /** Whether to allow loading local models */
    allowLocalModels: boolean;
    /** Whether to allow remote models */
    allowRemoteModels: boolean;
    /** Custom cache directory */
    cacheDir?: string;
    /** Whether running in a browser */
    isBrowser: boolean;
    /** Backend to use for computation */
    backends: {
      onnx: {
        wasm?: {
          numThreads: number;
        };
      };
    };
  };

  /**
   * Pipeline output type
   */
  export interface PipelineOutput {
    data: Float32Array | Float64Array;
    dims: number[];
  }

  /**
   * Pipeline function type
   */
  export interface Pipeline {
    (
      inputs: string | string[],
      options?: {
        pooling?: "none" | "mean" | "cls";
        normalize?: boolean;
        max_length?: number;
      },
    ): Promise<PipelineOutput>;
  }

  /**
   * Pipeline options
   */
  export interface PipelineOptions {
    /** Whether to use quantized model */
    quantized?: boolean;
    /** Progress callback */
    progress_callback?: (progress: {
      status: string;
      file?: string;
      loaded?: number;
      total?: number;
    }) => void;
    /** Custom cache directory */
    cache_dir?: string;
    /** Whether to use local models only */
    local_files_only?: boolean;
    /** Revision of the model */
    revision?: string;
  }

  /**
   * Supported pipeline tasks
   */
  export type PipelineTask =
    | "feature-extraction"
    | "text-classification"
    | "token-classification"
    | "question-answering"
    | "fill-mask"
    | "summarization"
    | "translation"
    | "text2text-generation"
    | "text-generation"
    | "zero-shot-classification"
    | "automatic-speech-recognition"
    | "image-to-text"
    | "image-classification"
    | "image-segmentation"
    | "object-detection"
    | "depth-estimation";

  /**
   * Create a pipeline for a specific task
   *
   * @param task - The task to create a pipeline for
   * @param model - The model to use
   * @param options - Pipeline options
   * @returns Promise<Pipeline>
   *
   * @example
   * const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
   * const output = await embedder("Hello world", { pooling: "mean", normalize: true });
   */
  export function pipeline(
    task: PipelineTask,
    model?: string,
    options?: PipelineOptions,
  ): Promise<Pipeline>;

  /**
   * AutoTokenizer class
   */
  export class AutoTokenizer {
    static from_pretrained(
      model: string,
      options?: { progress_callback?: (progress: unknown) => void },
    ): Promise<AutoTokenizer>;

    encode(
      text: string,
      options?: { add_special_tokens?: boolean },
    ): { input_ids: number[] };

    decode(
      tokens: number[],
      options?: { skip_special_tokens?: boolean },
    ): string;
  }

  /**
   * AutoModel class
   */
  export class AutoModel {
    static from_pretrained(
      model: string,
      options?: {
        quantized?: boolean;
        progress_callback?: (progress: unknown) => void;
      },
    ): Promise<AutoModel>;
  }

  /**
   * Tensor class
   */
  export class Tensor {
    data: Float32Array | Float64Array | Int32Array | BigInt64Array;
    dims: number[];
    type: string;

    constructor(
      type: string,
      data: ArrayLike<number> | ArrayBufferLike,
      dims: number[],
    );

    tolist(): number[] | number[][] | number[][][];
  }
}
