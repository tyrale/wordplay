# Proposal: Pass Turn Interaction Refactor

This document outlines the required changes to implement the new two-step pass turn interaction.

**Approval Status:** **PENDING**

---

## 1. Executive Summary

The goal is to enhance the user experience for passing a turn. Instead of an immediate pass on an invalid word submission, the user will be shown *why* the word is invalid and asked to confirm their intent to pass.

This requires two main efforts:
1.  **Engine Refactor**: The core game engine's validation functions will be updated to return detailed reasons for failure, not just a true/false value.
2.  **UI Implementation**: The user interface will be updated to handle the new two-step confirmation flow, displaying the reason and a confirmation message.

## 2. Engine Refactoring (`packages/engine/`)

The validation logic needs to be more expressive.

### `packages/engine/dictionary.ts`

*   **`validateWordWithDependencies`**:
    *   **Current**: Returns a simple `ValidationResult` with a `boolean` and an optional `string` reason.
    *   **Change**: The `ValidationResult` will be enhanced to return a structured `ValidationReason` enum/type.
        ```typescript
        export type ValidationReason = 
          | 'VALID' 
          | 'NOT_A_WORD' 
          | 'ALREADY_PLAYED' // This check will be moved here from gamestate
          | 'TOO_SHORT'
          | 'INVALID_CHARS';

        export interface ValidationResult {
          isValid: boolean;
          reason: ValidationReason;
          // ... other fields
        }
        ```
    *   The function logic will be updated to return the specific reason for failure.

### `packages/engine/scoring.ts`

*   **`isValidMove`**:
    *   **Current**: Returns a `boolean`.
    *   **Change**: Will be refactored to return a `ValidationResult` similar to the dictionary, with a reason like `'INVALID_MOVE_SHAPE'`. This will clearly distinguish a malformed move from a dictionary error.

### `packages/engine/gamestate.ts`

*   **`GameStateDependencies`**: The interfaces for `GameStateDictionaryDependencies` and `GameStateScoringDependencies` will be updated to reflect the new return types of the validation functions.
*   **`attemptMove`**:
    *   This function will be significantly updated to orchestrate the new validation flow.
    *   It will call the refactored validation functions.
    *   It will analyze the returned `ValidationResult` and package it into the `MoveAttempt` object that the UI consumes. This provides a clean separation of concerns. The UI hook (`useGameState`) will require minimal changes.

## 3. UI Implementation (`src/`)

The UI will be updated to manage and display the new pass confirmation state.

### `src/components/game/InteractiveGame.tsx`

*   **New State**: A new state variable will be added to manage the confirmation flow.
    ```typescript
    const [passRequest, setPassRequest] = useState<ValidationReason | null>(null);
    ```
*   **New `handleWordSubmit` logic**: This is the most critical UI change. A new function will be created to handle the submit action.
    ```typescript
    const handleWordSubmit = () => {
      // If a pass confirmation is already active, pass the turn.
      if (passRequest) {
        actions.passTurn();
        setPassRequest(null); // Reset the state
        return;
      }

      // Check the pending move attempt from the word builder.
      if (pendingMoveAttempt) {
        if (pendingMoveAttempt.isValid) {
          // If the move is valid, apply it.
          actions.applyMove(pendingMoveAttempt);
        } else {
          // If the move is invalid, start the pass confirmation.
          // The 'reason' will come from the refactored engine.
          setPassRequest(pendingMoveAttempt.validationResult.reason);
        }
      }
    };
    ```
*   **Cancel Pass**: An event handler will be added to the main game container that sets `setPassRequest(null)` on any click, canceling the pass flow if the user interacts with another part of the game.

### `src/components/game/SubmitButton.tsx` (or parent component)

*   This component will be modified to display the new messages.
*   It will receive `passRequest` as a prop.
*   **Conditional Rendering**:
    *   If `passRequest` is `NOT_A_WORD`, it will render `<span>not a word</span>`.
    *   If `passRequest` is `ALREADY_PLAYED`, it will render `<span>was played</span>`.
    *   If `passRequest` is active (not null), it will render `<span>tap again to pass</span>`.
*   **New CSS**: Styles will be added for the new text elements to control color and positioning relative to the `X` icon.

## 4. Testing

*   **`packages/engine/dictionary.test.ts`**: Tests will be updated to assert that `validateWord` returns the correct `ValidationReason`.
*   **`packages/engine/scoring.test.ts`**: Tests will be updated for `isValidMove`.
*   **`src/components/game/InteractiveGame.test.tsx`**: New tests will be written to simulate the two-tap pass flow and verify the UI state changes correctly. 