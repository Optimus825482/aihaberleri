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

  it('should generate speech successfully', async () => {
    const mockStdout = {
      on: jest.fn((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from('audio data'));
        }
      }),
    };
    const mockStderr = {
      on: jest.fn(),
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
    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString()).toBe('audio data');
    expect(mockSpawn).toHaveBeenCalledWith(
      expect.stringMatching(/python/),
      expect.arrayContaining([expect.stringContaining('tts_engine.py'), 'tr-TR-AhmetNeural'])
    );
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
