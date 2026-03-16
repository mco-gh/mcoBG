export interface TestCase {
  id: string;
  name: string;
  category: string;
  fn: () => Promise<void> | void;
}

export type TestStatus = "pending" | "running" | "pass" | "fail";

export interface TestResult {
  id: string;
  name: string;
  category: string;
  status: TestStatus;
  error?: string;
  duration?: number;
}

export function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(msg);
}

export function assertEqual<T>(actual: T, expected: T, msg?: string): void {
  if (actual !== expected)
    throw new Error(
      msg ?? `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
}

export function makeBoard(overrides: {
  points?: number[];
  whiteBar?: number;
  blackBar?: number;
  whiteOff?: number;
  blackOff?: number;
} = {}) {
  return {
    points: new Array(24).fill(0) as number[],
    whiteBar: 0,
    blackBar: 0,
    whiteOff: 0,
    blackOff: 0,
    ...overrides,
  };
}
