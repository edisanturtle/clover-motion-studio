/**
 * @file commandHistory.js
 * @description Canonical Transactional Command History & Undo/Redo Model (Fase 2)
 * Manages bounded transaction stacks, drag batching, and pure state transitions.
 */

export class CommandHistoryManager {
  constructor(maxDepth = 50) {
    this.maxDepth = maxDepth;
    this.undoStack = [];
    this.redoStack = [];
    this.activeTransaction = null;
  }

  /**
   * Pushes a new state transition to the history stack.
   * If a transaction is currently open, intermediate states are coalesced.
   * 
   * @param {object} previousState - State before modification
   * @param {object} nextState - State after modification
   * @param {string} description - Human-readable label (e.g. "Move Layer", "Change Ratio")
   */
  push(previousState, nextState, description = 'Edit') {
    if (this.activeTransaction) {
      // Keep initial previousState of the transaction, update current nextState
      this.activeTransaction.nextState = nextState;
      this.activeTransaction.lastUpdated = Date.now();
      return;
    }

    const command = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      description,
      previousState,
      nextState,
      timestamp: Date.now(),
    };

    this.undoStack.push(command);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
    // New action invalidates future redo stack
    this.redoStack = [];
  }

  /**
   * Starts a batched transaction for continuous operations (e.g. canvas dragging or slider scrubbing).
   * All modifications until commitTransaction() will create exactly ONE undo step.
   * 
   * @param {object} initialState - State at the moment interaction begins
   * @param {string} description - Transaction description
   */
  beginTransaction(initialState, description = 'Transform') {
    if (this.activeTransaction) return;
    this.activeTransaction = {
      description,
      previousState: initialState,
      nextState: initialState,
      startedAt: Date.now(),
      lastUpdated: Date.now(),
    };
  }

  /**
   * Commits the active batched transaction to the undo stack.
   */
  commitTransaction() {
    if (!this.activeTransaction) return;
    const { previousState, nextState, description } = this.activeTransaction;
    this.activeTransaction = null;

    // Only push if there was an actual change
    if (previousState !== nextState) {
      this.push(previousState, nextState, description);
    }
  }

  /**
   * Cancels the active transaction without recording it to history.
   */
  abortTransaction() {
    this.activeTransaction = null;
  }

  /**
   * Undoes the last command.
   * @returns {{ canUndo: boolean, state?: object, description?: string }}
   */
  undo() {
    if (this.undoStack.length === 0) return { canUndo: false };
    const command = this.undoStack.pop();
    this.redoStack.push(command);
    return {
      canUndo: true,
      state: command.previousState,
      description: command.description,
    };
  }

  /**
   * Redoes the last undone command.
   * @returns {{ canRedo: boolean, state?: object, description?: string }}
   */
  redo() {
    if (this.redoStack.length === 0) return { canRedo: false };
    const command = this.redoStack.pop();
    this.undoStack.push(command);
    return {
      canRedo: true,
      state: command.nextState,
      description: command.description,
    };
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.activeTransaction = null;
  }
}
