/**
 * The client's status enum is a hand-maintained mirror of backend/src/status.js.
 * If the two drift, chips render grey, filters silently return nothing, and the
 * patient's tracker sticks on the wrong step — all without an error anywhere.
 * This test reads the real backend file and refuses to let that happen.
 */

import fs from 'fs';
import path from 'path';

import {
  ALL_STATUSES, STATUS, STEPS, STEP_INDEX, chipStyle, contractCheck, queueParam, stepIndexOf,
} from '../src/constants/status';
import { hasTranslation } from '../src/translations';

// backend/ is a sibling of the app, or nested under it depending on the checkout.
const backendStatusPath = [
  path.join(__dirname, '..', '..', 'backend', 'src', 'status.js'),
  path.join(__dirname, '..', 'backend', 'src', 'status.js'),
].find(candidate => fs.existsSync(candidate));

describe('order status contract', () => {
  test('every status has a translation, a step and a chip colour', () => {
    expect(contractCheck(hasTranslation)).toEqual([]);
  });

  test('the client enum matches the backend enum exactly', () => {
    expect(backendStatusPath).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const backend = require(backendStatusPath as string);

    expect([...ALL_STATUSES].sort()).toEqual([...backend.ALL_STATUSES].sort());
    expect(STEPS).toEqual(backend.STEPS);
    expect(STEP_INDEX).toEqual(backend.STEP_INDEX);
  });

  test('the client and server agree on every step index', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const backend = require(backendStatusPath as string);
    for (const status of ALL_STATUSES) {
      expect(stepIndexOf(status)).toBe(backend.stepIndex(status));
    }
  });

  test('each staff queue asks the server for statuses it knows about', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const backend = require(backendStatusPath as string);
    for (const role of ['pro', 'agent', 'lab'] as const) {
      expect(queueParam(role).split(',')).toEqual(backend.QUEUES[role]);
    }
  });

  test('an unknown status still renders a chip rather than crashing', () => {
    expect(chipStyle('something_new')).toEqual(chipStyle(STATUS.SUBMITTED));
  });
});
