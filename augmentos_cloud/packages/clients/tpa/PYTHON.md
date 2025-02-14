# Python TPA Implementation Guide

This guide demonstrates how to implement an AugmentOS TPA in Python. The WebSocket protocol can be implemented in any language - this example uses Python with `websockets` and `FastAPI`.

## Table of Contents
- [Setup](#setup)
- [Basic Implementation](#basic-implementation)
- [Complete Example](#complete-example)
- [Advanced Patterns](#advanced-patterns)

## Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install fastapi uvicorn websockets
```

## Basic Implementation

Here's a simple captions TPA implemented in Python:

```python
import json
import asyncio
import websockets
from fastapi import FastAPI, Request
from datetime import datetime

app = FastAPI()

# Track active sessions
active_sessions = {}

class TpaSession:
    def __init__(self, session_id: str, package_name: str, api_key: str):
        self.session_id = session_id
        self.package_name = package_name
        self.api_key = api_key
        self.websocket = None
    
    async def connect(self, server_url: str):
        self.websocket = await websockets.connect(server_url)
        
        # Send connection init
        await self.send_message({
            "type": "tpa_connection_init",
            "sessionId": self.session_id,
            "packageName": self.package_name,
            "apiKey": self.api_key
        })
    
    async def subscribe(self, stream_types):
        await self.send_message({
            "type": "subscription_update",
            "packageName": self.package_name,
            "subscriptions": stream_types
        })
    
    async def show_reference_card(self, title: str, text: str, duration_ms: int = None):
        await self.send_message({
            "type": "display_event",
            "packageName": self.package_name,
            "layout": {
                "layoutType": "reference_card",
                "title": title,
                "text": text
            },
            "durationMs": duration_ms,
            "timestamp": datetime.utcnow().isoformat(),
            "view": "main"
        })
    
    async def send_message(self, message: dict):
        if self.websocket:
            await self.websocket.send(json.dumps(message))
    
    async def listen(self):
        while True:
            try:
                message = await self.websocket.recv()
                data = json.loads(message)
                await self.handle_message(data)
            except websockets.ConnectionClosed:
                print(f"Connection closed for session {self.session_id}")
                break
            except Exception as e:
                print(f"Error handling message: {e}")
    
    async def handle_message(self, message: dict):
        message_type = message.get("type")
        
        if message_type == "tpa_connection_ack":
            # Connection confirmed, subscribe to transcription
            await self.subscribe(["transcription"])
            
        elif message_type == "data_stream":
            if message["streamType"] == "transcription":
                # Handle transcription data
                data = message["data"]
                await self.show_reference_card(
                    "Captions",
                    data["text"],
                    3000 if data["isFinal"] else None
                )

# Webhook endpoint
@app.post("/webhook")
async def webhook(request: Request):
    data = await request.json()
    session_id = data["sessionId"]
    user_id = data["userId"]
    
    print(f"New session request: {session_id} for user {user_id}")
    
    # Create new session
    session = TpaSession(
        session_id=session_id,
        package_name="org.example.captions",
        api_key="your_api_key"
    )
    
    try:
        # Connect to AugmentOS Cloud
        await session.connect("ws://localhost:7002/tpa-ws")
        
        # Store session
        active_sessions[session_id] = session
        
        # Start listening for messages
        asyncio.create_task(session.listen())
        
        return {"status": "connected"}
    except Exception as e:
        print(f"Failed to connect: {e}")
        return {"error": str(e)}, 500

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7010)
```

## Complete Example

Here's a more complete example with reconnection handling and error recovery:

```python
import json
import asyncio
import websockets
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from datetime import datetime
from enum import Enum
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StreamType(Enum):
    TRANSCRIPTION = "transcription"
    HEAD_POSITION = "head_position"
    BUTTON_PRESS = "button_press"
    PHONE_NOTIFICATIONS = "phone_notifications"

class LayoutType(Enum):
    TEXT_WALL = "text_wall"
    DOUBLE_TEXT_WALL = "double_text_wall"
    REFERENCE_CARD = "reference_card"

class TpaSession:
    def __init__(self, session_id: str, package_name: str, api_key: str):
        self.session_id = session_id
        self.package_name = package_name
        self.api_key = api_key
        self.websocket = None
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        self.base_delay = 1.0
        
    async def connect(self, server_url: str) -> bool:
        try:
            self.websocket = await websockets.connect(server_url)
            await self.send_connection_init()
            return True
        except Exception as e:
            logger.error(f"Connection failed: {e}")
            return False
    
    async def reconnect(self, server_url: str) -> bool:
        if self.reconnect_attempts >= self.max_reconnect_attempts:
            logger.error("Max reconnection attempts reached")
            return False
        
        delay = self.base_delay * (2 ** self.reconnect_attempts)
        self.reconnect_attempts += 1
        
        logger.info(f"Attempting reconnection in {delay} seconds...")
        await asyncio.sleep(delay)
        
        return await self.connect(server_url)
    
    async def send_connection_init(self):
        await self.send_message({
            "type": "tpa_connection_init",
            "sessionId": self.session_id,
            "packageName": self.package_name,
            "apiKey": self.api_key,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def subscribe(self, stream_types: list[StreamType]):
        await self.send_message({
            "type": "subscription_update",
            "packageName": self.package_name,
            "subscriptions": [st.value for st in stream_types]
        })
    
    # Layout Methods
    async def show_text_wall(self, text: str, duration_ms: int = None):
        await self.send_display_event({
            "layoutType": LayoutType.TEXT_WALL.value,
            "text": text
        }, duration_ms)
    
    async def show_double_text_wall(
        self, 
        top_text: str, 
        bottom_text: str, 
        duration_ms: int = None
    ):
        await self.send_display_event({
            "layoutType": LayoutType.DOUBLE_TEXT_WALL.value,
            "topText": top_text,
            "bottomText": bottom_text
        }, duration_ms)
    
    async def show_reference_card(
        self, 
        title: str, 
        text: str, 
        duration_ms: int = None
    ):
        await self.send_display_event({
            "layoutType": LayoutType.REFERENCE_CARD.value,
            "title": title,
            "text": text
        }, duration_ms)
    
    async def send_display_event(self, layout: dict, duration_ms: int = None):
        await self.send_message({
            "type": "display_event",
            "packageName": self.package_name,
            "layout": layout,
            "durationMs": duration_ms,
            "timestamp": datetime.utcnow().isoformat(),
            "view": "main"
        })
    
    async def send_message(self, message: dict):
        if self.websocket and self.websocket.open:
            await self.websocket.send(json.dumps(message))
    
    async def listen(self, server_url: str):
        while True:
            try:
                message = await self.websocket.recv()
                data = json.loads(message)
                await self.handle_message(data)
            except websockets.ConnectionClosed:
                logger.warning(f"Connection closed for session {self.session_id}")
                
                if await self.reconnect(server_url):
                    logger.info("Reconnected successfully")
                    continue
                else:
                    break
            except Exception as e:
                logger.error(f"Error handling message: {e}")
    
    async def handle_message(self, message: dict):
        try:
            message_type = message.get("type")
            
            if message_type == "tpa_connection_ack":
                logger.info("Connection acknowledged")
                await self.subscribe([StreamType.TRANSCRIPTION])
                
            elif message_type == "data_stream":
                stream_type = message["streamType"]
                data = message["data"]
                
                if stream_type == StreamType.TRANSCRIPTION.value:
                    await self.handle_transcription(data)
                    
                elif stream_type == StreamType.HEAD_POSITION.value:
                    await self.handle_head_position(data)
        except Exception as e:
            logger.error(f"Error in handle_message: {e}")
    
    async def handle_transcription(self, data: dict):
        await self.show_reference_card(
            "Captions",
            data["text"],
            3000 if data["isFinal"] else None
        )
    
    async def handle_head_position(self, data: dict):
        await self.show_text_wall(
            f"Head position: {data['position']}",
            1000
        )

class TpaServer:
    def __init__(
        self,
        package_name: str,
        api_key: str,
        port: int = 7010,
        server_url: str = "ws://localhost:7002/tpa-ws"
    ):
        self.package_name = package_name
        self.api_key = api_key
        self.port = port
        self.server_url = server_url
        self.active_sessions = {}
        
        self.app = FastAPI()
        self.setup_routes()
    
    def setup_routes(self):
        @self.app.post("/webhook")
        async def webhook(request: Request):
            data = await request.json()
            return await self.handle_webhook(data)
        
        @self.app.get("/health")
        async def health():
            return {
                "status": "healthy",
                "app": self.package_name,
                "activeSessions": len(self.active_sessions)
            }
        
        # Serve static files if needed
        # self.app.mount("/static", StaticFiles(directory="static"), name="static")
    
    async def handle_webhook(self, data: dict):
        session_id = data["sessionId"]
        user_id = data["userId"]
        
        logger.info(f"New session request: {session_id} for user {user_id}")
        
        # Create new session
        session = TpaSession(
            session_id=session_id,
            package_name=self.package_name,
            api_key=self.api_key
        )
        
        try:
            # Connect to AugmentOS Cloud
            if await session.connect(self.server_url):
                # Store session
                self.active_sessions[session_id] = session
                
                # Start listening for messages
                asyncio.create_task(session.listen(self.server_url))
                
                return {"status": "connected"}
            else:
                return {"error": "Failed to connect"}, 500
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            return {"error": str(e)}, 500
    
    def run(self):
        import uvicorn
        uvicorn.run(self.app, host="0.0.0.0", port=self.port)

# Usage example
if __name__ == "__main__":
    server = TpaServer(
        package_name="org.example.captions",
        api_key="your_api_key",
        port=7010
    )
    server.run()
```

## Advanced Patterns

### Custom Event Handler Class

```python
from abc import ABC, abstractmethod
from typing import Any, Callable, Dict

class EventHandler(ABC):
    @abstractmethod
    async def handle(self, data: Dict[str, Any]) -> None:
        pass

class TranscriptionHandler(EventHandler):
    def __init__(self, session: TpaSession):
        self.session = session
    
    async def handle(self, data: Dict[str, Any]) -> None:
        await self.session.show_reference_card(
            "Captions",
            data["text"],
            3000 if data["isFinal"] else None
        )

class HeadPositionHandler(EventHandler):
    def __init__(self, session: TpaSession):
        self.session = session
    
    async def handle(self, data: Dict[str, Any]) -> None:
        await self.session.show_text_wall(
            f"Head position: {data['position']}",
            1000
        )

# Usage in TpaSession
class TpaSession:
    def __init__(self, ...):
        self.handlers: Dict[str, EventHandler] = {
            StreamType.TRANSCRIPTION.value: TranscriptionHandler(self),
            StreamType.HEAD_POSITION.value: HeadPositionHandler(self)
        }
    
    async def handle_message(self, message: dict):
        if message["type"] == "data_stream":
            handler = self.handlers.get(message["streamType"])
            if handler:
                await handler.handle(message["data"])
```

### State Management

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class SessionState:
    last_transcription: Optional[str] = None
    head_position: Optional[str] = None
    active_displays: int = 0

class StateManager:
    def __init__(self, session: TpaSession):
        self.session = session
        self.state = SessionState()
    
    async def update_transcription(self, text: str, is_final: bool):
        self.state.last_transcription = text
        await self.update_display()
    
    async def update_head_position(self, position: str):
        self.state.head_position = position
        await self.update_display()
    
    async def update_display(self):
        # Combine head position and transcription into a meaningful display
        if self.state.head_position == "up":
            # Show transcription prominently when looking up
            if self.state.last_transcription:
                await self.session.show_reference_card(
                    "Looking Up + Speech",
                    self.state.last_transcription
                )
        else:
            # Show minimal display when looking elsewhere
            await self.session.show_text_wall(
                self.state.last_transcription or "No speech detected"
            )

# Usage in TpaSession
class TpaSession:
    def __init__(self, ...):
        self.state_manager = StateManager(self)
    
    async def handle_message(self, message: dict):
        if message["type"] == "data_stream":
            if message["streamType"] == "transcription":
                data = message["data"]
                await self.state_manager.update_transcription(
                    data["text"],
                    data["isFinal"]
                )
            elif message["streamType"] == "head_position":
                await self.state_manager.update_head_position(
                    message["data"]["position"]
                )
```

### Async Queue Processing

```python
import asyncio
from asyncio import Queue
from dataclasses import dataclass
from typing import Any, Dict

@dataclass
class EventMessage:
    stream_type: str
    data: Dict[str, Any]

class EventProcessor:
    def __init__(self, session: TpaSession):
        self.session = session
        self.queue: Queue[EventMessage] = Queue()
        self.running = True
    
    async def start(self):
        """Start processing events from the queue"""
        while self.running:
            try:
                event = await self.queue.get()
                await self.process_event(event)
                self.queue.task_done()
            except Exception as e:
                logger.error(f"Error processing event: {e}")
    
    async def stop(self):
        """Stop the event processor"""
        self.running = False
        await self.queue.join()  # Wait for remaining events
    
    async def add_event(self, stream_type: str, data: Dict[str, Any]):
        """Add new event to processing queue"""
        await self.queue.put(EventMessage(stream_type, data))
    
    async def process_event(self, event: EventMessage):
        """Process a single event"""
        try:
            if event.stream_type == StreamType.TRANSCRIPTION.value:
                await self.handle_transcription(event.data)
            elif event.stream_type == StreamType.HEAD_POSITION.value:
                await self.handle_head_position(event.data)
        except Exception as e:
            logger.error(f"Error in event processor: {e}")
    
    async def handle_transcription(self, data: Dict[str, Any]):
        await self.session.show_reference_card(
            "Queued Transcription",
            data["text"],
            3000 if data["isFinal"] else None
        )
    
    async def handle_head_position(self, data: Dict[str, Any]):
        await self.session.show_text_wall(
            f"Queued head position: {data['position']}",
            1000
        )

# Usage in TpaSession
class TpaSession:
    def __init__(self, ...):
        self.event_processor = EventProcessor(self)
        self.tasks = []
    
    async def start(self):
        # Start event processor
        self.tasks.append(
            asyncio.create_task(self.event_processor.start())
        )
    
    async def handle_message(self, message: dict):
        if message["type"] == "data_stream":
            await self.event_processor.add_event(
                message["streamType"],
                message["data"]
            )
    
    async def cleanup(self):
        # Stop event processor
        await self.event_processor.stop()
        # Cancel all tasks
        for task in self.tasks:
            task.cancel()
```

### Complete Example with All Features

Here's how to combine all these patterns into a full-featured TPA:

```python
import asyncio
import logging
from typing import Dict, Any
from fastapi import FastAPI
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class AppConfig:
    package_name: str
    api_key: str
    port: int = 7010
    server_url: str = "ws://localhost:7002/tpa-ws"
    max_reconnect_attempts: int = 5
    base_delay: float = 1.0

class AdvancedTpaServer:
    def __init__(self, config: AppConfig):
        self.config = config
        self.active_sessions: Dict[str, AdvancedTpaSession] = {}
        self.app = FastAPI()
        self.setup_routes()
    
    def setup_routes(self):
        @self.app.post("/webhook")
        async def webhook(request: Request):
            data = await request.json()
            return await self.handle_webhook(data)
        
        @self.app.get("/health")
        async def health():
            return {
                "status": "healthy",
                "app": self.config.package_name,
                "activeSessions": len(self.active_sessions)
            }
    
    async def handle_webhook(self, data: Dict[str, Any]):
        session_id = data["sessionId"]
        user_id = data["userId"]
        
        logger.info(f"New session request: {session_id} for user {user_id}")
        
        session = AdvancedTpaSession(
            session_id=session_id,
            config=self.config
        )
        
        try:
            await session.start()
            self.active_sessions[session_id] = session
            return {"status": "connected"}
        except Exception as e:
            logger.error(f"Failed to start session: {e}")
            await session.cleanup()
            return {"error": str(e)}, 500
    
    def run(self):
        import uvicorn
        uvicorn.run(self.app, host="0.0.0.0", port=self.config.port)

class AdvancedTpaSession:
    def __init__(self, session_id: str, config: AppConfig):
        self.session_id = session_id
        self.config = config
        self.websocket = None
        self.state_manager = StateManager(self)
        self.event_processor = EventProcessor(self)
        self.tasks = []
    
    async def start(self):
        # Connect to WebSocket
        if await self.connect():
            # Start event processor
            self.tasks.append(
                asyncio.create_task(self.event_processor.start())
            )
            # Start message listener
            self.tasks.append(
                asyncio.create_task(self.listen())
            )
        else:
            raise Exception("Failed to connect")
    
    async def cleanup(self):
        await self.event_processor.stop()
        for task in self.tasks:
            task.cancel()
        if self.websocket:
            await self.websocket.close()

# Usage
if __name__ == "__main__":
    config = AppConfig(
        package_name="org.example.advanced",
        api_key="your_api_key",
        port=7010
    )
    
    server = AdvancedTpaServer(config)
    server.run()
```

## Best Practices

1. **Error Handling**
   - Always handle WebSocket connection errors
   - Implement reconnection logic
   - Log errors appropriately
   - Clean up resources properly

2. **Async Patterns**
   - Use asyncio for all I/O operations
   - Implement proper task management
   - Handle task cancellation correctly
   - Use queues for event processing

3. **State Management**
   - Keep state organized and typed
   - Update state atomically
   - Handle concurrent updates
   - Clean up state properly

4. **Message Processing**
   - Validate message formats
   - Handle unknown message types
   - Process messages asynchronously
   - Implement timeout handling

## See Also
- [PROTOCOL.md](./PROTOCOL.md) - Protocol documentation
- [README.md](./README.md) - Main documentation
- [TYPESCRIPT.md](./TYPESCRIPT.md) - TypeScript implementation