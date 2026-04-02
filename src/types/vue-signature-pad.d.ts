declare module 'vue-signature-pad' {
  import { DefineComponent } from 'vue';

  interface SignaturePadOptions {
    penColor?: string;
    minWidth?: number;
    maxWidth?: number;
    backgroundColor?: string;
    dotSize?: number;
    throttle?: number;
  }

  interface SaveResult {
    isEmpty: boolean;
    data: string;
  }

  const VueSignaturePad: DefineComponent<{
    width?: string;
    height?: string;
    options?: SignaturePadOptions;
    customStyle?: Record<string, string>;
  }> & {
    saveSignature(type?: string): SaveResult;
    clearSignature(): void;
    resizeCanvas(): void;
    undoSignature(): void;
    isEmpty(): boolean;
  };

  export default VueSignaturePad;
}
