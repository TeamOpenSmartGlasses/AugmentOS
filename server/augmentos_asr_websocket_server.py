import azure.cognitiveservices.speech as speechsdk
import asyncio
import websockets
import json
import time
import datetime
import threading
from dataclasses import dataclass
from typing import Optional, Dict
from pathlib import Path

@dataclass
class StreamConfig:
    """Holds ASR stream configuration settings (e.g., language, translation settings)."""
    language: str
    translation_language: Optional[str] = None

class ASRStream:
    """
    Handles an active ASR session with Azure Speech-to-Text.
    Uses a WebSocket connection to receive audio data and send recognized text.
    """

    def __init__(self, speech_key: str, service_region: str, config: StreamConfig, websocket):
        """
        Initializes an ASR stream with Azure's Speech SDK.

        :param speech_key: Azure Speech API key
        :param service_region: Azure service region (e.g., "eastus")
        :param config: Language configuration for ASR
        :param websocket: WebSocket connection to send recognition results
        """
        self.speech_config = speechsdk.SpeechConfig(
            subscription=speech_key, 
            region=service_region
        )
        self.speech_config.speech_recognition_language = config.language
        
        # Set aggressive silence detection (500ms)
        self.speech_config.set_property(
            speechsdk.PropertyId.Speech_SegmentationSilenceTimeoutMs, "500"
        )
        
        # Create a PushAudioInputStream for feeding audio dynamically
        self.push_stream = speechsdk.audio.PushAudioInputStream()
        self.audio_config = speechsdk.audio.AudioConfig(stream=self.push_stream)
        
        # Create a speech recognizer
        self.recognizer = speechsdk.SpeechRecognizer(
            speech_config=self.speech_config, 
            audio_config=self.audio_config
        )

        self.websocket = websocket  # WebSocket connection for sending recognized text
        self.results = []  # Stores recognition results
        self.is_active = False  # Tracks if ASR is running
        self.loop = asyncio.get_running_loop()  # Get current event loop

        self._setup_callbacks()  # Initialize event handlers
        self.recognition_task = None  # Track async recognition process

    def _setup_callbacks(self):
        """Registers event handlers for receiving ASR results."""
        
        def handle_interim(evt):
            """Handles interim ASR results (partial transcriptions)."""
            if not self.is_active:
                return

            result = {
                'type': 'interim',
                'text': evt.result.text,
                'timestamp': time.time()
            }
            self.results.append(result)

            # Send result asynchronously over WebSocket
            asyncio.run_coroutine_threadsafe(
                self.websocket.send(json.dumps(result)),
                self.loop
            )

        def handle_final(evt):
            """Handles final ASR results (completed sentences)."""
            if not self.is_active:
                return

            result = {
                'type': 'final',
                'text': evt.result.text,
                'timestamp': time.time()
            }
            self.results.append(result)

            # Send result asynchronously over WebSocket
            asyncio.run_coroutine_threadsafe(
                self.websocket.send(json.dumps(result)),
                self.loop
            )

        def handle_canceled(evt):
            """Handles errors and cancellations from Azure ASR."""
            print(f"[ASR] Recognition canceled: {evt.result.cancellation_details.reason}")

        # Connect event handlers to the recognizer
        self.recognizer.recognizing.connect(handle_interim)
        self.recognizer.recognized.connect(handle_final)
        self.recognizer.canceled.connect(handle_canceled)

    async def start(self):
        """Starts ASR using a non-blocking callback approach."""
        if not self.is_active:
            self.is_active = True
            print("[ASR] Starting ASR...")
            self.recognizer.start_continuous_recognition_async().get()  # ✅ Call `.get()` instead

    async def stop(self):
        """Stops ASR using a non-blocking callback approach."""
        if self.is_active:
            self.is_active = False
            print("[ASR] Stopping ASR...")
            self.recognizer.stop_continuous_recognition_async().get()  # ✅ Call `.get()` instead

    def write_audio_data(self, audio_data: bytes):
        """
        Feeds incoming audio data into the ASR engine.

        :param audio_data: Raw audio bytes (16-bit PCM, 16kHz)
        """
        CHUNK_SIZE = 3200  # 100ms of audio at 16kHz, 16-bit

        for i in range(0, len(audio_data), CHUNK_SIZE):
            chunk = audio_data[i:i+CHUNK_SIZE]
            self.push_stream.write(chunk)

    async def close(self):
        """Gracefully shuts down the ASR stream and releases resources."""
        await self.stop()
        self.push_stream.close()


class ASRWebSocketServer:
    """Manages the ASR WebSocket server and active client streams."""

    def __init__(self, speech_key: str, service_region: str, max_concurrent: int):
        self.speech_key = speech_key
        self.service_region = service_region
        self.active_streams: Dict[str, ASRStream] = {}
        self.max_concurrent = max_concurrent

    async def handle_client(self, websocket):
        """Handles a new WebSocket client connection."""
        client_id = str(id(websocket))
        print(f"[Server] New client connected: {client_id}")
        
        try:
            # Wait for configuration message
            config_msg = await websocket.recv()
            config = StreamConfig(**json.loads(config_msg))
            
            # Create new ASR stream for this client
            asr_stream = ASRStream(
                self.speech_key,
                self.service_region,
                config,
                websocket
            )
            self.active_streams[client_id] = asr_stream

            # Start the recognition
            await asr_stream.start()

            # Handle incoming audio data
            async for message in websocket:
                if isinstance(message, bytes):
                    asr_stream.write_audio_data(message)
                else:
                    try:
                        msg_json = json.loads(message)
                        if msg_json.get("type") == "VAD":
                            vad_status = msg_json.get("status")
                            print(f"[VAD] Received VAD status: {vad_status}")  

                            if vad_status == "false":
                                print("[VAD] Silence detected, stopping ASR...")
                                await asr_stream.stop()
                            elif vad_status == "true":
                                print("[VAD] Speech detected, resuming ASR...")
                                await asr_stream.start()

                    except json.JSONDecodeError:
                        print(f"[Server] Invalid JSON message: {message}")

        except websockets.exceptions.ConnectionClosed:
            print(f"[Server] Client disconnected: {client_id}")  
        except Exception as e:
            print(f"[Server] Error handling client {client_id}: {e}")
        finally:
            print(f"[Server] Cleaning up client {client_id}")
            if client_id in self.active_streams:
                await self.active_streams[client_id].close()
                del self.active_streams[client_id]
                print(f"[Server] Active streams remaining: {len(self.active_streams)}")


def load_config(config_path: str = "config.json") -> dict:
    """Loads configuration from a JSON file."""
    try:
        with open(config_path) as f:
            return json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(f"Config file not found: {config_path}")
    except json.JSONDecodeError:
        raise ValueError(f"Invalid JSON in config file: {config_path}")


async def main():
    """Main entry point to start the ASR WebSocket server."""
    config = load_config()

    server = ASRWebSocketServer(
        speech_key=config['azure_speech']['key'],
        service_region=config['azure_speech']['region'],
        max_concurrent=config['server']['max_concurrent']
    )

    print("[Server] Starting WebSocket ASR Server...")
    websocket_server = await websockets.serve(
        server.handle_client,
        config['server']['host'],
        config['server']['port']
    )
    print(f"[Server] Running on ws://{config['server']['host']}:{config['server']['port']}")

    await websocket_server.wait_closed()


if __name__ == "__main__":
    asyncio.run(main())
