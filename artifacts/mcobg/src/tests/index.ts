export type { TestCase, TestResult, TestStatus } from "./types";
export { assert, assertEqual, makeBoard } from "./types";

import { gameLogicTests } from "./gameLogicTests";
import { socketTests } from "./socketTests";

export const allTests = [...gameLogicTests, ...socketTests];

export const categories = [...new Set(allTests.map((t) => t.category))];
