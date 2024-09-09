import asyncio
from augmentos_client import TPAClient

def on_transcript(data):
    print(f"[ExampleTPA on_transcript] Data received in callback: {data}")

def on_other(data):
    print(f"[ExampleTPA on_other] Data received in callback: {data}")

async def main():
    # Create a TPAClient instance
    client = TPAClient(
        app_id="com.exampletpa.example",
        app_name="ExampleTPA",
        app_description="An example app for AugmentOS",
        server_url="http://localhost:8080",  # Base URL where AugmentOS is hosted
        subscriptions=["*"]
    )

    # Register the callback function
    client.on_transcript_received(on_transcript)
    client.on_other_received(on_other)

    # Start the FastAPI server in a separate thread
    client.start()

    # Send some data; the WebSocket connection will be initiated automatically if not already open
    # await asyncio.sleep(4)
    await client.send_display_request("Hello from ExampleTPA!")

    # Run indefinitely to keep the FastAPI app running
    while True:
        await asyncio.sleep(3600)

# Run the example
if __name__ == "__main__":
    asyncio.run(main())
