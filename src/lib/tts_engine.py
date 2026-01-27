import sys
import asyncio
import edge_tts
import json

async def main():
    # Read text from stdin (supports long text)
    text = sys.stdin.read().strip()
    if not text:
        sys.stderr.write("Error: No text provided")
        sys.exit(1)

    # Get voice from args or default
    voice = "tr-TR-AhmetNeural"
    if len(sys.argv) > 1:
        voice = sys.argv[1]

    metadata = []
    
    try:
        communicate = edge_tts.Communicate(text, voice)
        
        # We'll collect metadata and stream audio
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                sys.stdout.buffer.write(chunk["data"])
                sys.stdout.buffer.flush()
            elif chunk["type"] == "WordBoundary":
                # offset is in ticks (100ns), duration is in ticks
                # Convert to seconds for easier use in JS
                metadata.append({
                    "text": chunk["text"],
                    "start": chunk["offset"] / 10000000,
                    "duration": chunk["duration"] / 10000000
                })
        
        # After audio stream is done, we can't write to stdout anymore if it's binary
        # Let's write metadata to stderr as a single JSON line at the end
        if metadata:
            sys.stderr.write("METADATA_START\n")
            sys.stderr.write(json.dumps(metadata))
            sys.stderr.write("\nMETADATA_END\n")
                
    except Exception as e:
        sys.stderr.write(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if sys.platform == "win32":
        # Fix for Windows asyncio loop issues
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(main())