import { generateSpeech } from '../edge-tts';
import path from 'path';

// Mock child_process spawn
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

describe('edge-tts', () => {
  const mockSpawn = require('child_process').spawn;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate speech and metadata successfully', async () => {
    const mockStdout = {
      on: jest.fn((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from('audio data'));
        }
      }),
    };
    const mockStderr = {
      on: jest.fn((event, callback) => {
        if (event === 'data') {
          // Send metadata in one chunk, no newlines to be safe
          callback(Buffer.from('METADATA_START[{"text":"mock","start":0,"duration":1}]METADATA_END'));
        }
      }),
    };
    const mockStdin = {
      write: jest.fn(),
      end: jest.fn(),
    };

    const mockChildProcess = {
      stdout: mockStdout,
      stderr: mockStderr,
      stdin: mockStdin,
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          callback(0);
        }
      }),
    };

    mockSpawn.mockReturnValue(mockChildProcess);

    const result = await generateSpeech({ text: 'Hello' });
    expect(result.audio).toBeInstanceOf(Buffer);
    expect(result.audio.toString()).toBe('audio data');
    expect(result.metadata).toHaveLength(1);
    expect(result.metadata[0].text).toBe('mock');
  });

  it('should handle python errors', async () => {
     const mockStdout = {
      on: jest.fn(),
    };
    const mockStderr = {
      on: jest.fn((event, callback) => {
         if (event === 'data') {
            callback(Buffer.from('Python Error'));
         }
      }),
    };
    const mockStdin = {
      write: jest.fn(),
      end: jest.fn(),
    };

    const mockChildProcess = {
      stdout: mockStdout,
      stderr: mockStderr,
      stdin: mockStdin,
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          callback(1);
        }
      }),
    };

    mockSpawn.mockReturnValue(mockChildProcess);

    await expect(generateSpeech({ text: 'Fail' })).rejects.toThrow('TTS failed with code 1: Python Error');
  });
});
