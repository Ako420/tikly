import { EventEmitter } from 'node:events';
import type { Server } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { registerProcessHandlers } from '../src/lib/shutdown';

function setup() {
  const proc = Object.assign(new EventEmitter(), { exit: vi.fn() });
  const server = { close: vi.fn((done: () => void) => done()) } as unknown as Server;
  const cleanup = vi.fn(async () => {});
  registerProcessHandlers({ server, cleanup, proc: proc as unknown as NodeJS.Process });
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  return { proc, server, cleanup, settle };
}

describe('process handlers', () => {
  it('closes the server, disconnects and exits with 1 on an unhandled rejection', async () => {
    const { proc, server, cleanup, settle } = setup();
    proc.emit('unhandledRejection', new Error('boom'));
    await settle();
    expect(server.close).toHaveBeenCalledOnce();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(proc.exit).toHaveBeenCalledWith(1);
  });

  it('exits with 1 on an uncaught exception and only shuts down once', async () => {
    const { proc, cleanup, settle } = setup();
    proc.emit('uncaughtException', new Error('first'));
    proc.emit('uncaughtException', new Error('second'));
    await settle();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(proc.exit).toHaveBeenCalledOnce();
    expect(proc.exit).toHaveBeenCalledWith(1);
  });

  it('exits cleanly with 0 on SIGTERM', async () => {
    const { proc, settle } = setup();
    proc.emit('SIGTERM');
    await settle();
    expect(proc.exit).toHaveBeenCalledWith(0);
  });
});
