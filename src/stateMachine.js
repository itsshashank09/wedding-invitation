/**
 * Strict Finite State Machine for Cinematic Wedding Invitation
 * Enforces valid transition paths between the 6 explicit states.
 */

export const CinemaState = Object.freeze({
  GANESH_IDLE: 'GANESH_IDLE',
  GANESH_PLAYING: 'GANESH_PLAYING',
  GANESH_FINAL_FRAME: 'GANESH_FINAL_FRAME',
  WHITE_FLASH: 'WHITE_FLASH',
  FRONT_PAGE_REVEAL: 'FRONT_PAGE_REVEAL',
  FRONT_PAGE_PLAYING: 'FRONT_PAGE_PLAYING',
});

const VALID_TRANSITIONS = {
  [CinemaState.GANESH_IDLE]: [CinemaState.GANESH_PLAYING],
  [CinemaState.GANESH_PLAYING]: [CinemaState.GANESH_FINAL_FRAME],
  [CinemaState.GANESH_FINAL_FRAME]: [CinemaState.WHITE_FLASH],
  [CinemaState.WHITE_FLASH]: [CinemaState.FRONT_PAGE_REVEAL],
  [CinemaState.FRONT_PAGE_REVEAL]: [CinemaState.FRONT_PAGE_PLAYING],
  [CinemaState.FRONT_PAGE_PLAYING]: [CinemaState.GANESH_IDLE], // Optional reset path
};

export class CinemaStateMachine {
  constructor() {
    this._state = CinemaState.GANESH_IDLE;
    this._listeners = new Set();
  }

  get state() {
    return this._state;
  }

  is(state) {
    return this._state === state;
  }

  transitionTo(nextState, context = {}) {
    const validTargets = VALID_TRANSITIONS[this._state] || [];
    if (!validTargets.includes(nextState)) {
      console.warn(`[CinemaFSM] Invalid state transition: ${this._state} -> ${nextState}`);
      return false;
    }

    const prevState = this._state;
    this._state = nextState;
    console.log(`[CinemaFSM] Transition: ${prevState} -> ${nextState}`, context);

    this._notify(nextState, prevState, context);
    return true;
  }

  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  _notify(nextState, prevState, context) {
    for (const listener of this._listeners) {
      try {
        listener(nextState, prevState, context);
      } catch (err) {
        console.error('[CinemaFSM] Error in state listener:', err);
      }
    }
  }
}
