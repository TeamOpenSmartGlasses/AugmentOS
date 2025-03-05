import { parentPort } from 'worker_threads';
import * as fs from 'fs';
import * as path from 'path';

interface LC3Instance {
  samples: Float32Array;
  frame: Uint8Array;
  decode(): void;
}

if (!parentPort) {
  throw new Error('This file must be run as a worker');
}

let wasmInstance: WebAssembly.Instance;
const instances = new Map<string, LC3Instance>();

// LC3 parameters
const frameDurationUs = 10000;
const sampleRateHz = 16000;
const frameBytes = 20;
let frameSamples = 0;
let decoderSize = 0;
let memoryBasePtr = 0;

// Batch processing
let sharedArrayBuffer: SharedArrayBuffer | null = null;
let sharedMemory: Int32Array | null = null;

async function initializeWasm() {
  const wasmPath = path.resolve(__dirname, 'liblc3.wasm');
  const wasmBuffer = fs.readFileSync(wasmPath);
  const wasmModule = await WebAssembly.instantiate(wasmBuffer, {});
  wasmInstance = wasmModule.instance;

  // Initialize sizes
  frameSamples = (wasmInstance.exports.lc3_frame_samples as Function)(
    frameDurationUs,
    sampleRateHz
  );
  
  decoderSize = (wasmInstance.exports.lc3_decoder_size as Function)(
    frameDurationUs,
    sampleRateHz
  );

  // Setup shared memory for synchronization
  sharedArrayBuffer = new SharedArrayBuffer(4);
  sharedMemory = new Int32Array(sharedArrayBuffer);
}

function createDecoderInstance(): LC3Instance {
  const memory = wasmInstance.exports.memory as WebAssembly.Memory;
  
  // Calculate memory needs
  const instanceSize = decoderSize + (frameSamples * 4) + frameBytes;
  const alignedSize = Math.ceil(instanceSize / 4) * 4;

  // Grow memory if needed
  const requiredMemory = memoryBasePtr + alignedSize;
  const currentMemory = memory.buffer.byteLength;
  
  if (requiredMemory > currentMemory) {
    const additionalPages = Math.ceil((requiredMemory - currentMemory) / (64 * 1024));
    memory.grow(additionalPages);
  }

  // Layout memory
  const decoderPtr = memoryBasePtr;
  const samplePtr = decoderPtr + decoderSize;
  const framePtr = samplePtr + (frameSamples * 4);

  memoryBasePtr += alignedSize;

  // Initialize decoder
  (wasmInstance.exports.lc3_setup_decoder as Function)(
    frameDurationUs,
    sampleRateHz,
    sampleRateHz,
    decoderPtr
  );

  return {
    samples: new Float32Array(memory.buffer, samplePtr, frameSamples),
    frame: new Uint8Array(memory.buffer, framePtr, frameBytes),
    decode: () => {
      (wasmInstance.exports.lc3_decode as Function)(
        decoderPtr,
        framePtr,
        frameBytes,
        3,  // Float format
        samplePtr,
        1
      );
    }
  };
}

function processBatch(instance: LC3Instance, audioData: Uint8Array, numFrames: number): ArrayBuffer {
  const outputSize = numFrames * frameSamples * 2; // 16-bit PCM
  const outputBuffer = new ArrayBuffer(outputSize);
  const outputView = new DataView(outputBuffer);
  let outputOffset = 0;

  // Process all frames in batch
  for (let i = 0; i < numFrames; i++) {
    instance.frame.set(
      audioData.subarray(i * frameBytes, (i + 1) * frameBytes)
    );

    instance.decode();

    // Convert to PCM efficiently
    for (let j = 0; j < frameSamples; j++) {
      const pcmValue = Math.max(-32768, 
        Math.min(32767, Math.floor(instance.samples[j] * 32768))
      );
      outputView.setInt16(outputOffset, pcmValue, true);
      outputOffset += 2;
    }
  }

  return outputBuffer;
}

// Initialize and start handling messages
initializeWasm().then(() => {
  parentPort!.on('message', ({ type, userId, data, frames }) => {
    try {
      switch(type) {
        case 'decode': {
          let instance = instances.get(userId);
          if (!instance) {
            instance = createDecoderInstance();
            instances.set(userId, instance);
          }
          
          const result = processBatch(instance, new Uint8Array(data), frames);
          parentPort!.postMessage({ type: 'decoded', data: result }, [result]);
          break;
        }
        
        case 'cleanup': {
          instances.delete(userId);
          parentPort!.postMessage({ type: 'cleaned' });
          break;
        }
      }
    } catch (error) {
      parentPort!.postMessage({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
});