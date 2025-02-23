// @augmentos/utils/src/lc3/LC3Service.ts

import * as fs from 'fs';
import * as path from 'path';

export class LC3Service {
  private static instance: LC3Service;
  private lc3Exports: WebAssembly.Exports | null = null;
  private decoder: number | null = null;
  private initialized = false;
  private lastAllocationSize = 0;
  private memoryFailureCount = 0;
  private readonly MAX_RETRIES = 3;

  // LC3 decoding parameters
  private readonly frameDurationUs = 10000; // 10ms per frame
  private readonly sampleRateHz = 16000;    // 16kHz
  private readonly bytesPerFrame = 20;      // LC3 compressed bytes per frame

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
      
      // Initialize with modest memory
      const wasmModule = await WebAssembly.instantiate(wasmBuffer, {
        env: {
          memory: new WebAssembly.Memory({ 
            initial: 16,  // Start with 1MB
            maximum: 512  // Allow up to 32MB if needed
          })
        }
      });
      
      this.lc3Exports = wasmModule.instance.exports;

      // Initialize decoder
      const decoderSize = (this.lc3Exports.lc3_decoder_size as Function)(
        this.frameDurationUs,
        this.sampleRateHz
      );
      
      this.decoder = this.allocateMemory(decoderSize);
      
      (this.lc3Exports.lc3_setup_decoder as Function)(
        this.frameDurationUs,
        this.sampleRateHz,
        this.sampleRateHz,
        this.decoder
      );

      this.initialized = true;
      console.log('✅ LC3 Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize LC3 Service:', error);
      throw error;
    }
  }

  private allocateMemory(size: number): number {
    if (!this.lc3Exports) throw new Error('LC3 not initialized');
    
    try {
      // If last allocation was successful, try same size first
      if (this.lastAllocationSize > 0 && size <= this.lastAllocationSize) {
        const ptr = (this.lc3Exports.memory as WebAssembly.Memory).grow(
          Math.ceil(this.lastAllocationSize / (64 * 1024))
        );
        return ptr * 64 * 1024;
      }

      // Try allocating requested size
      const pages = Math.ceil(size / (64 * 1024));
      const ptr = (this.lc3Exports.memory as WebAssembly.Memory).grow(pages);
      this.lastAllocationSize = size;
      this.memoryFailureCount = 0; // Reset failure count on success
      return ptr * 64 * 1024;
    } catch (error) {
      console.error('Failed to allocate memory:', error);
      this.memoryFailureCount++;
      
      if (this.memoryFailureCount >= this.MAX_RETRIES) {
        // Try to reinitialize WASM with fresh memory
        this.initialized = false;
        this.initialize().catch(console.error);
      }
      
      throw error;
    }
  }

  async decodeAudioChunk(audioData: ArrayBuffer): Promise<ArrayBuffer | null> {
    if (!this.initialized || !this.lc3Exports || !this.decoder) {
      // If not initialized, try to initialize but return null for this chunk
      if (!this.initialized) {
        this.initialize().catch(console.error);
      }
      return null;
    }

    try {
      const encodedSize = audioData.byteLength;
      const numFrames = Math.floor(encodedSize / this.bytesPerFrame);
      const frameSamples = (this.lc3Exports.lc3_frame_samples as Function)(
        this.frameDurationUs,
        this.sampleRateHz
      );
      const pcmBytesPerFrame = frameSamples * 2; // 16-bit PCM
      const outputSize = numFrames * pcmBytesPerFrame;

      // Allocate input and output buffers
      const inputPtr = this.allocateMemory(encodedSize);
      const outputPtr = this.allocateMemory(outputSize);

      // Copy input data to WASM memory
      const memoryBuffer = new Uint8Array((this.lc3Exports.memory as WebAssembly.Memory).buffer);
      memoryBuffer.set(new Uint8Array(audioData), inputPtr);

      // Decode frames
      let outputOffset = 0;
      for (let i = 0; i < numFrames; i++) {
        const inputFramePtr = inputPtr + i * this.bytesPerFrame;
        const outputFramePtr = outputPtr + outputOffset;

        (this.lc3Exports.lc3_decode as Function)(
          this.decoder,
          inputFramePtr,
          this.bytesPerFrame,
          0, // PCM format: 0 = S16
          outputFramePtr,
          1
        );

        outputOffset += pcmBytesPerFrame;
      }

      // Extract decoded PCM data
      return memoryBuffer.slice(outputPtr, outputPtr + outputSize).buffer;
    } catch (error) {
      console.error('❌ Error decoding LC3 audio:', error);
      
      // Return null instead of throwing to keep transcription going
      return null;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const lc3Service = LC3Service.getInstance();
export default lc3Service;