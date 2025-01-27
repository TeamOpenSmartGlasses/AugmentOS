import azure.cognitiveservices.speech as speechsdk
import asyncio
import websockets
import json
import time
import datetime
import threading
from dataclasses import dataclass
from typing import Optional, Dict, List
from pathlib import Path

@dataclass
class StreamConfig:
    """Holds ASR stream configuration settings."""
    streamType: str  # "transcription" or "translation"
    transcribeLanguage: str
    translateLanguage: Optional[str] = None
    stream_id: Optional[str] = None  # Made optional since frontend doesn't send it

class ASRStream:
    """
    Handles an active ASR session with Azure Speech-to-Text.
    Uses a WebSocket connection to receive audio data and send recognized text.
    """

    def __init__(self, speech_key: str, service_region: str, config: StreamConfig, websocket):
        """
        Initializes an ASR stream with Azure's Speech SDK.
        """
        self.stream_id = config.stream_id
        self.streamType = config.streamType
        self.transcribeLanguage = config.transcribeLanguage
        self.translateLanguage = config.translateLanguage
        self.websocket = websocket
        self.is_active = False
        self.loop = asyncio.get_running_loop()

        # Azure Speech Configuration
        if self.streamType == "translation":
            self.translation_config = speechsdk.translation.SpeechTranslationConfig(
                subscription=speech_key, region=service_region
            )
            self.translation_config.speech_recognition_language = self.transcribeLanguage
            if self.translateLanguage:
                self.translation_config.add_target_language(self.translateLanguage)
            
            self.push_stream = speechsdk.audio.PushAudioInputStream()
            self.audio_config = speechsdk.audio.AudioConfig(stream=self.push_stream)
            
            self.recognizer = speechsdk.translation.TranslationRecognizer(
                translation_config=self.translation_config,
                audio_config=self.audio_config
            )
        else:  # transcription
            self.speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=service_region)
            self.speech_config.speech_recognition_language = self.transcribeLanguage
            self.speech_config.set_property(speechsdk.PropertyId.Speech_SegmentationSilenceTimeoutMs, "500")
            
            self.push_stream = speechsdk.audio.PushAudioInputStream()
            self.audio_config = speechsdk.audio.AudioConfig(stream=self.push_stream)
            
            self.recognizer = speechsdk.SpeechRecognizer(
                speech_config=self.speech_config,
                audio_config=self.audio_config
            )

        self._setup_callbacks()

    def _setup_callbacks(self):
        """Registers event handlers for ASR results."""
        
        def handle_canceled(evt):
            """Handle canceled events."""
            print(f"[ASR] Recognition canceled: {evt.result.reason}")
            if evt.result.reason == speechsdk.CancellationReason.Error:
                print(f"[ASR] Error details: {evt.result.error_details}")

        def handle_session_started(evt):
            """Handle session start events."""
            print(f"[ASR] Session started: {evt}")

        def handle_session_stopped(evt):
            """Handle session stop events."""
            print(f"[ASR] Session stopped: {evt}")

        """Registers event handlers for ASR results."""
        
        def handle_interim(evt):
            """Handles interim ASR results (partial transcriptions)."""
            if not self.is_active:
                return

            if self.streamType == "translation":
                text = evt.result.translations.get(self.translateLanguage, "")
            else:
                text = evt.result.text

            if text:
                result = {
                    "type": "interim",
                    "text": text,
                    "timestamp": time.time(),
                    "language": self.transcribeLanguage
                }
                if self.streamType == "translation":
                    result["translateLanguage"] = self.translateLanguage
                asyncio.run_coroutine_threadsafe(
                    self.websocket.send(json.dumps(result)), self.loop
                )

        def handle_final(evt):
            """Handles final ASR results (completed sentences)."""
            if not self.is_active:
                return

            if self.streamType == "translation":
                text = evt.result.translations.get(self.translateLanguage, "")
            else:
                text = evt.result.text

            if text:
                result = {
                    "type": "final",
                    "text": text,
                    "timestamp": time.time(),
                    "language": self.transcribeLanguage
                }
                if self.streamType == "translation":
                    result["translateLanguage"] = self.translateLanguage
                asyncio.run_coroutine_threadsafe(
                    self.websocket.send(json.dumps(result)), self.loop
                )

        self.recognizer.recognizing.connect(handle_interim)
        self.recognizer.recognized.connect(handle_final)
        self.recognizer.canceled.connect(handle_canceled)
        self.recognizer.session_started.connect(handle_session_started)
        self.recognizer.session_stopped.connect(handle_session_stopped)

    async def start(self):
        """Starts ASR processing."""
        if not self.is_active:
            self.is_active = True
            print(f"[ASR] Starting stream {self.stream_id}...")
            self.recognizer.start_continuous_recognition_async().get()

    async def stop(self):
        """Stops ASR processing."""
        if self.is_active:
            self.is_active = False
            print(f"[ASR] Stopping stream {self.stream_id}...")
            self.recognizer.stop_continuous_recognition_async().get()

    def write_audio_data(self, audio_data: bytes):
        """Feeds incoming audio data into the ASR engine."""
        self.push_stream.write(audio_data)

    async def close(self):
        """Shuts down ASR stream and releases resources."""
        await self.stop()
        self.push_stream.close()

    def _get_language_code(self, language: str) -> str:
        """Convert common language names to BCP-47 codes."""
        language_map = {
            "English": "en-US",
            "Spanish": "es-ES",
            "French": "fr-FR",
            "German": "de-DE",
            "Italian": "it-IT",
            "Portuguese": "pt-PT",
            "Chinese": "zh-CN",
            "Japanese": "ja-JP",
            "Korean": "ko-KR",
            "Russian": "ru-RU"
        }
        return language_map.get(language, language)  # If not found, return original value

class ASRWebSocketServer:
    """Manages the ASR WebSocket server and active client streams."""

    def __init__(self, speech_key: str, service_region: str, max_concurrent: int):
        self.speech_key = speech_key
        self.service_region = service_region
        self.active_streams: Dict[str, Dict[str, ASRStream]] = {}  # {client_id: {stream_id: ASRStream}}
        self.max_concurrent = max_concurrent
        self.language_map = {
            "English": "en-US",
            "Spanish": "es-ES",
            "French": "fr-FR",
            "German": "de-DE",
            "Italian": "it-IT",
            "Portuguese": "pt-PT",
            "Chinese": "zh-CN",
            "Japanese": "ja-JP",
            "Korean": "ko-KR",
            "Russian": "ru-RU"
        }

    def _get_language_code(self, language: str) -> str:
        """Convert common language names to BCP-47 codes."""
        return self.language_map.get(language, language)  # If not found, return original value

    async def handle_client(self, websocket):
        """Handles a new WebSocket client connection."""
        client_id = str(id(websocket))
        print(f"[Server] New client connected: {client_id}")
        self.active_streams[client_id] = {}

        try:
            async for message in websocket:
                if isinstance(message, bytes):
                    # Binary data (audio chunk)
                    if client_id in self.active_streams:
                        for stream in self.active_streams[client_id].values():
                            stream.write_audio_data(message)
                else:
                    # JSON message
                    try:
                        msg_json = json.loads(message)
                        msg_type = msg_json.get("type")
                        
                        if msg_type == "config":
                            streams = msg_json.get("streams", [])
                            await self._handle_config(client_id, streams, websocket)
                        elif msg_type == "VAD":
                            vad_status = msg_json.get("status")
                            print(f"[VAD] Received VAD status: {vad_status}")
                        else:
                            print(f"[Server] Unknown message type: {msg_json}")
                    except json.JSONDecodeError:
                        print(f"[Server] Failed to decode message: {message}")

        except websockets.exceptions.ConnectionClosed:
            print(f"[Server] Client disconnected: {client_id}")
        except Exception as e:
            print(f"[Server] Error handling client {client_id}: {e}")
        finally:
            await self._cleanup_client(client_id)

    async def _handle_config(self, client_id: str, streams: List[dict], websocket):
        """Handles configuration updates from the client."""
        # Stop all existing streams for this client
        for stream in self.active_streams[client_id].values():
            await stream.close()
        self.active_streams[client_id] = {}

        # Create new streams based on config
        for i, stream_config in enumerate(streams):
            # Generate a stream ID since frontend doesn't provide one
            stream_id = f"{client_id}_stream_{i}"
            
            config = StreamConfig(
                stream_id=stream_id,
                streamType=stream_config["streamType"],
                transcribeLanguage=self._get_language_code(stream_config["transcribeLanguage"]),
                translateLanguage=self._get_language_code(stream_config.get("translateLanguage")) if stream_config.get("translateLanguage") else None
            )
            
            asr_stream = ASRStream(
                self.speech_key,
                self.service_region,
                config,
                websocket
            )
            self.active_streams[client_id][stream_id] = asr_stream
            await asr_stream.start()

        print(f"[Server] Updated streams for client {client_id}: {list(self.active_streams[client_id].keys())}")

    async def _cleanup_client(self, client_id: str):
        """Clean up resources when a client disconnects."""
        if client_id in self.active_streams:
            for stream in self.active_streams[client_id].values():
                await stream.close()
            del self.active_streams[client_id]
        print(f"[Server] Cleaned up client {client_id}")

async def main():
    config = json.load(open("config.json"))
    server = ASRWebSocketServer(
        config['azure_speech']['key'],
        config['azure_speech']['region'],
        config['server']['max_concurrent']
    )
    print("[Server] Starting WebSocket ASR Server...")
    print(f"[Server] Running on ws://{config['server']['host']}:{config['server']['port']}")
    async with websockets.serve(
        server.handle_client,
        config['server']['host'],
        config['server']['port']
    ):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())