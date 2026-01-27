import sys
import asyncio
import edge_tts

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

    try:
        communicate = edge_tts.Communicate(text, voice)
        
        # Write binary to stdout
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                sys.stdout.buffer.write(chunk["data"])
                sys.stdout.buffer.flush()
                
    except Exception as e:
        sys.stderr.write(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if sys.platform == "win32":
        # Fix for Windows asyncio loop issues
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(main())
