import { CallbackOutput, ConsoleOutput, WebSocketInput } from '../src/adapters';
import { Receiver } from '../src/receiver';

describe('Receiver', () => {
  it('should create with default config', () => {
    const r = new Receiver();
    expect(r.status).toBe('reconnecting');
    expect(r.fallbackActive).toBe(false);
  });

  it('should return output state with 49 cannons', () => {
    const r = new Receiver();
    const state = r.getOutputState();
    expect(state).toHaveLength(49);
    expect(state[0]).toHaveProperty('h');
    expect(state[0]).toHaveProperty('s');
    expect(state[0]).toHaveProperty('b');
  });

  it('should accept custom adapters', () => {
    const received: unknown[] = [];
    const input = new WebSocketInput({ url: 'ws://example.com:9999' });
    const output = new CallbackOutput((grid) => { received.push(grid); });
    const r = new Receiver({
      input,
      output,
      alpha: 0.03,
      fallbackDelay: 5000
    });
    expect(r.status).toBe('reconnecting');
    const state = r.getOutputState();
    expect(state).toHaveLength(49);
  });

  it('should accept ConsoleOutput adapter', () => {
    const output = new ConsoleOutput({ logEveryNFrames: 120 });
    const r = new Receiver({ output });
    expect(r.status).toBe('reconnecting');
  });
});
