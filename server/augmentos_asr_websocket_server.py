import azure.cognitiveservices.speech as speechsdk
import asyncio
import websockets
import json
import time
import datetime
import numpy as np
import threading
from dataclasses import dataclass
from typing import Optional, Dict
from pathlib import Path

@dataclass
class StreamConfig:
    language: str
    translation_language: Optional[str] = None

class ASRStream:
    def __init__(self, speech_key: str, service_region: str, config: StreamConfig, websocket):
        self.speech_config = speechsdk.SpeechConfig(
            subscription=speech_key, 
            region=service_region
        )
        self.speech_config.speech_recognition_language = config.language
        
        # Configure for more aggressive recognition
        self.speech_config.set_property(
            speechsdk.PropertyId.Speech_SegmentationSilenceTimeoutMs, "500"
        )
        
        # Create custom audio stream class
        self.push_stream = speechsdk.audio.PushAudioInputStream()
        self.audio_config = speechsdk.audio.AudioConfig(stream=self.push_stream)
        
        # Create the speech recognizer
        self.recognizer = speechsdk.SpeechRecognizer(
            speech_config=self.speech_config, 
            audio_config=self.audio_config
        )
        
        self.results = []
        self.start_time = None
        self.is_active = False
        self.loop = asyncio.get_running_loop()
        self._setup_callbacks(websocket)
        
        # Start recognition in a separate thread
        self.recognition_thread = threading.Thread(target=self._run_recognition)
        self.recognition_thread.daemon = True
        self.recognition_thread.start()

    def _setup_callbacks(self, websocket):
        def handle_interim(evt):
            if self.start_time is None:
                return
                
            result = {
                'type': 'interim',
                'text': evt.result.text,
                'timestamp': time.time() - self.start_time
            }
            self.results.append(result)
            print(f"[{self._format_timestamp(result['timestamp'])}] Interim: {result['text']}")
            
            # Properly schedule the coroutine on the event loop
            asyncio.run_coroutine_threadsafe(
                websocket.send(json.dumps(result)),
                self.loop
            )

        def handle_final(evt):
            if self.start_time is None:
                return
                
            result = {
                'type': 'final',
                'text': evt.result.text,
                'timestamp': time.time() - self.start_time
            }
            self.results.append(result)
            print(f"[{self._format_timestamp(result['timestamp'])}] Final: {result['text']}")
            
            # Properly schedule the coroutine on the event loop
            asyncio.run_coroutine_threadsafe(
                websocket.send(json.dumps(result)),
                self.loop
            )

        def handle_canceled(evt):
            print(f"Recognition canceled: {evt.result.cancellation_details.reason}")
            print(f"Error details: {evt.result.cancellation_details.error_details}")

        self.recognizer.recognizing.connect(handle_interim)
        self.recognizer.recognized.connect(handle_final)
        self.recognizer.canceled.connect(handle_canceled)

    def _format_timestamp(self, seconds):
        return datetime.datetime.fromtimestamp(seconds).strftime('%H:%M:%S.%f')[:-3]

    def _run_recognition(self):
        """Run continuous recognition in a separate thread"""
        self.recognizer.start_continuous_recognition()
        while self.is_active:
            time.sleep(0.1)  # Prevent busy waiting
        self.recognizer.stop_continuous_recognition()

    def start(self):
        """Start recognition"""
        self.is_active = True
        self.start_time = time.time()

    def stop(self):
        """Stop recognition"""
        self.is_active = False
        self.recognition_thread.join()

    def write_audio_data(self, audio_data: bytes):
        """Write audio data to the stream"""
        # Write in smaller chunks to encourage more frequent processing
        CHUNK_SIZE = 3200  # 100ms of audio at 16kHz, 16-bit
        
        for i in range(0, len(audio_data), CHUNK_SIZE):
            chunk = audio_data[i:i+CHUNK_SIZE]
            self.push_stream.write(chunk)

    def close(self):
        """Close the stream and cleanup"""
        self.stop()
        self.push_stream.close()

class ASRWebSocketServer:
    def __init__(self, speech_key: str, service_region: str, max_concurrent: int):
        self.speech_key = speech_key
        self.service_region = service_region
        self.active_streams: Dict[str, ASRStream] = {}
        self.max_concurrent = max_concurrent

    async def handle_client(self, websocket):
        """Handle a new WebSocket client connection"""
        client_id = str(id(websocket))
        print(f"New client connected: {client_id}")
        
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
            asr_stream.start()
            
            # Handle incoming audio data
            async for message in websocket:
                if isinstance(message, bytes):
                    asr_stream.write_audio_data(message)
                else:
                    print(f"Received non-binary message: {message}")
                    
        except websockets.exceptions.ConnectionClosed:
            print(f"Client disconnected: {client_id}")  # This is here but we need more cleanup
        except Exception as e:
            print(f"Error handling client {client_id}: {e}")
        finally:
            # Cleanup when client disconnects
            print(f"Client disconnected: {client_id}")  # This is here but we need more cleanup
            if client_id in self.active_streams:
                print(f"Cleaning up stream for client {client_id}")
                self.active_streams[client_id].close()
                del self.active_streams[client_id]
                print(f"Active streams remaining: {len(self.active_streams)}")

def load_config(config_path: str = "config.json") -> dict:
    """Load configuration from JSON file"""
    try:
        with open(config_path) as f:
            config = json.load(f)
        return config
    except FileNotFoundError:
        raise FileNotFoundError(f"Config file not found: {config_path}")
    except json.JSONDecodeError:
        raise ValueError(f"Invalid JSON in config file: {config_path}")

async def main():
    # Load configuration
    config = load_config()
    
    # Create server
    server = ASRWebSocketServer(
        speech_key=config['azure_speech']['key'],
        service_region=config['azure_speech']['region'],
        max_concurrent=config['server']['max_concurrent']
    )
    
    try:
        # Start WebSocket server
        print("Starting WebSocket server...")
        websocket_server = await websockets.serve(
            server.handle_client,
            config['server']['host'],
            config['server']['port']
        )
        print(f"WebSocket ASR Server started on ws://{config['server']['host']}:{config['server']['port']}")
        
        await websocket_server.wait_closed()
    except Exception as e:
        print(f"Server error: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())


