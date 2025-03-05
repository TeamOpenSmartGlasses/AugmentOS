import * as fs from 'fs';
import * as path from 'path';

interface LC3Instance {
  samples: Float32Array;
  frame: Uint8Array;
  decode(): void;
}

export class LC3Service {
  private static instance: LC3Service;
  private lc3Exports: WebAssembly.Exports | null = null;
  private decoder: LC3Instance | null = null;
  private initialized = false;
  private allocationSize = 0;
  
  // LC3 decoding parameters
  private readonly frameDurationUs = 10000; // 10ms per frame
  private readonly sampleRateHz = 16000;    // 16kHz
  private readonly bytesPerFrame = 20;      // LC3 compressed bytes per frame
  private readonly frameBytes = 20;         // Fixed for our case
  
  private decoderSize = 0;
  private frameSamples = 0;

  private constructor() {}

  static getInstance(): LC3Service {
    if (!LC3Service.instance) {
      LC3Service.instance = new LC3Service();
    }
    return LC3Service.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load WASM file
      const wasmPath = path.resolve(__dirname, 'liblc3.wasm');
      console.log('Loading WASM from:', wasmPath);
      
      const wasmBuffer = fs.readFileSync(wasmPath);
      
      // Initialize WebAssembly
      const wasmModule = await WebAssembly.instantiate(wasmBuffer, {});
      this.lc3Exports = wasmModule.instance.exports;

      // Calculate sizes
      this.frameSamples = (this.lc3Exports.lc3_frame_samples as Function)(
        this.frameDurationUs,
        this.sampleRateHz
      );
      
      this.decoderSize = (this.lc3Exports.lc3_decoder_size as Function)(
        this.frameDurationUs,
        this.sampleRateHz
      );

      // Calculate total memory needed: decoder + samples + frame buffer
      this.allocationSize = this.decoderSize +
                           (this.frameSamples * 4) + // Float32 samples
                           this.frameBytes;          // frame buffer
                           
      // Align to 4 bytes
      this.allocationSize = Math.ceil(this.allocationSize / 4) * 4;

      // Create decoder instance
      this.decoder = this.createDecoder();

      this.initialized = true;
      console.log('✅ LC3 Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize LC3 Service:', error);
      throw error;
    }
  }

  private createDecoder(): LC3Instance {
    if (!this.lc3Exports) throw new Error('LC3 not initialized');

    const memory = this.lc3Exports.memory as WebAssembly.Memory;
    const basePtr = memory.buffer.byteLength;

    // Ensure we have enough memory
    const pagesNeeded = Math.ceil((basePtr + this.allocationSize) / (64 * 1024));
    const currentPages = memory.buffer.byteLength / (64 * 1024);
    
    if (pagesNeeded > currentPages) {
      memory.grow(pagesNeeded - currentPages);
    }

    // Layout memory regions
    const decoderPtr = basePtr;
    const samplePtr = decoderPtr + this.decoderSize;
    const framePtr = samplePtr + (this.frameSamples * 4);

    // Initialize decoder
    (this.lc3Exports.lc3_setup_decoder as Function)(
      this.frameDurationUs,
      this.sampleRateHz,
      this.sampleRateHz,
      decoderPtr
    );

    return {
      samples: new Float32Array(memory.buffer, samplePtr, this.frameSamples),
      frame: new Uint8Array(memory.buffer, framePtr, this.frameBytes),
      decode: () => {
        (this.lc3Exports!.lc3_decode as Function)(
          decoderPtr,
          framePtr,
          this.frameBytes,
          3,  // Float format (3) for better performance
          samplePtr,
          1
        );
      }
    };
  }

  async decodeAudioChunk(audioData: ArrayBuffer): Promise<ArrayBuffer | null> {
    if (!this.initialized || !this.lc3Exports || !this.decoder) {
      if (!this.initialized) {
        await this.initialize();
      }
      return null;
    }

    try {
      const numFrames = Math.floor(audioData.byteLength / this.bytesPerFrame);
      const totalSamples = numFrames * this.frameSamples;
      const outputBuffer = new ArrayBuffer(totalSamples * 2); // 16-bit PCM
      const outputView = new DataView(outputBuffer);
      const inputData = new Uint8Array(audioData);

      let outputOffset = 0;
      for (let i = 0; i < numFrames; i++) {
        // Copy frame data
        this.decoder.frame.set(
          inputData.subarray(i * this.bytesPerFrame, (i + 1) * this.bytesPerFrame)
        );

        // Decode frame
        this.decoder.decode();

        // Convert Float32 samples to Int16 PCM
        for (let j = 0; j < this.frameSamples; j++) {
          const pcmValue = Math.max(-32768, 
            Math.min(32767, Math.floor(this.decoder.samples[j] * 32768))
          );
          outputView.setInt16(outputOffset, pcmValue, true);
          outputOffset += 2;
        }
      }

      return outputBuffer;
    } catch (error) {
      console.error('❌ Error decoding LC3 audio:', error);
      return null;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const lc3Service = LC3Service.getInstance();
export default lc3Service;