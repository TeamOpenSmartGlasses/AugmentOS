import * as fs from "fs";
import * as path from "path";

// Path to the liblc3 WebAssembly file
const wasmPath: string = path.resolve(__dirname, "./liblc3.wasm");

// Load the WebAssembly module
async function loadLC3(): Promise<WebAssembly.Exports> {
    const wasmBuffer = fs.readFileSync(wasmPath);
    const wasmModule = await WebAssembly.instantiate(wasmBuffer, {});
    return wasmModule.instance.exports;
}

// Function to allocate memory in the WASM buffer
function allocateMemory(lc3: WebAssembly.Exports, size: number): number {
    const ptr = (lc3.memory as WebAssembly.Memory).grow(Math.ceil(size / (64 * 1024))); // Grow memory in pages
    return ptr * 64 * 1024; // Convert page index to byte offset
}

// Decode LC3 audio
async function decodeLC3(): Promise<void> {
    const lc3 = await loadLC3();

    // Read LC3 encoded audio file
    const inputFile: string = path.resolve(__dirname, "audio_chunk_0.raw");
    const encodedBytes: Buffer = fs.readFileSync(inputFile);
    const encodedSize: number = encodedBytes.length;

    // LC3 decoding parameters
    const frameDurationUs = 10000; // 10ms per frame
    const sampleRateHz = 16000; // 16kHz
    const outputByteCount = 20; // LC3 compressed bytes per frame
    const numFrames = Math.floor(encodedSize / outputByteCount);
    const frameSamples = (lc3.lc3_frame_samples as Function)(frameDurationUs, sampleRateHz);
    const bytesPerFrame = frameSamples * 2; // 16-bit PCM (2 bytes per sample)
    const outputSize = numFrames * bytesPerFrame;

    // Allocate memory in WASM
    const inputPtr = allocateMemory(lc3, encodedSize);
    const outputPtr = allocateMemory(lc3, outputSize);
    const decoderSize = (lc3.lc3_decoder_size as Function)(frameDurationUs, sampleRateHz);
    const decoderPtr = allocateMemory(lc3, decoderSize);

    // Copy input data to WASM memory
    const memoryBuffer = new Uint8Array((lc3.memory as WebAssembly.Memory).buffer);
    memoryBuffer.set(encodedBytes, inputPtr);

    // Initialize LC3 decoder
    (lc3.lc3_setup_decoder as Function)(frameDurationUs, sampleRateHz, sampleRateHz, decoderPtr);

    // Decode frames
    let outputOffset = 0;
    for (let i = 0; i < numFrames; i++) {
        const inputFramePtr = inputPtr + i * outputByteCount;
        const outputFramePtr = outputPtr + outputOffset;

        (lc3.lc3_decode as Function)(
            decoderPtr,
            inputFramePtr,
            outputByteCount,
            0, // PCM format: 0 = S16 (signed 16-bit PCM)
            outputFramePtr,
            1
        );

        outputOffset += bytesPerFrame;
    }

    // Retrieve PCM data
    const pcmData = Buffer.from(memoryBuffer.slice(outputPtr, outputPtr + outputSize));

    // Write PCM output to file
    const outputFile = path.resolve(__dirname, "decoded_audio.pcm");
    fs.writeFileSync(outputFile, pcmData);

    console.log(`Decoded audio written to: ${outputFile}`);
}

decodeLC3().catch(console.error);

