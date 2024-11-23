from pylsl import StreamInfo, StreamOutlet, local_clock
import time

# Create a new LSL stream for timestamps
info = StreamInfo('RealTimestamps', 'Markers', 1, 0, 'float32', 'realtime_clock')  # Use 'float32' instead of 'float64'
outlet = StreamOutlet(info)

print("Starting timestamp stream...")
while True:
    timestamp = time.time()  # Get the current local time
    outlet.push_sample([timestamp])  # Send it as a sample
    time.sleep(0.01)  # Stream timestamps every second
