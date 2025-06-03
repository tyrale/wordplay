/**
 * Bot AI v0 (Greedy Strategy)
 *
 * This module provides a greedy bot AI for the WordPlay game that chooses
 * the highest scoring legal moves by generating and evaluating all possible
 * word transformations (add/remove/rearrange letters).
 *
 * Key Features:
 * - Greedy strategy (chooses highest scoring moves)
 * - Move generation for add/remove/rearrange operations
 * - Key letter prioritization and bonus scoring
 * - Fair play (follows same validation rules as human players)
 * - Performance optimized for <50ms average latency
 * - Integration with scoring module and word validation
 *
 * Note: This bot plays fairly for balanced gameplay. The validation system
 * supports rule-breaking bots (isBot: true) for advanced difficulty modes,
 * but this v0 Greedy bot uses standard validation (isBot: false).
 */
import { getScoreForMove } from './scoring';
import { validateWord, isValidDictionaryWord } from './dictionary';
// Common letter frequencies for move generation priority
const COMMON_LETTERS = 'ETAOINSHRDLCUMWFGYPBVKJXQZ'.split('');
/**
 * Generates all possible single letter additions to a word
 */
export function generateAddMoves(currentWord) {
    const candidates = [];
    const word = currentWord.toUpperCase();
    // Try adding each letter at each position
    for (let pos = 0; pos <= word.length; pos++) {
        for (const letter of COMMON_LETTERS) {
            const newWord = word.slice(0, pos) + letter + word.slice(pos);
            candidates.push({
                word: newWord,
                type: 'add',
                operations: [`Add ${letter} at position ${pos}`]
            });
        }
    }
    return candidates;
}
/**
 * Generates all possible single letter removals from a word
 */
export function generateRemoveMoves(currentWord) {
    const candidates = [];
    const word = currentWord.toUpperCase();
    // Try removing each letter
    for (let pos = 0; pos < word.length; pos++) {
        const removedLetter = word[pos];
        const newWord = word.slice(0, pos) + word.slice(pos + 1);
        candidates.push({
            word: newWord,
            type: 'remove',
            operations: [`Remove ${removedLetter} from position ${pos}`]
        });
    }
    return candidates;
}
/**
 * Generates rearrangement moves by shuffling letters
 */
export function generateRearrangeMoves(currentWord, maxVariations = 50) {
    const candidates = [];
    const word = currentWord.toUpperCase();
    const letters = word.split('');
    const generated = new Set();
    generated.add(word); // Don't include original word
    // Generate permutations using various strategies
    for (let i = 0; i < maxVariations && generated.size < maxVariations + 1; i++) {
        const shuffled = [...letters];
        // Different shuffling strategies
        if (i < 10) {
            // Simple adjacent swaps
            const pos1 = Math.floor(Math.random() * shuffled.length);
            const pos2 = (pos1 + 1) % shuffled.length;
            [shuffled[pos1], shuffled[pos2]] = [shuffled[pos2], shuffled[pos1]];
        }
        else if (i < 20) {
            // Random swaps
            const pos1 = Math.floor(Math.random() * shuffled.length);
            const pos2 = Math.floor(Math.random() * shuffled.length);
            [shuffled[pos1], shuffled[pos2]] = [shuffled[pos2], shuffled[pos1]];
        }
        else {
            // Full shuffle
            for (let j = shuffled.length - 1; j > 0; j--) {
                const k = Math.floor(Math.random() * (j + 1));
                [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
            }
        }
        const newWord = shuffled.join('');
        if (!generated.has(newWord)) {
            generated.add(newWord);
            candidates.push({
                word: newWord,
                type: 'rearrange',
                operations: [`Rearrange letters: ${word} → ${newWord}`]
            });
        }
    }
    return candidates;
}
/**
 * Generates substitution moves (remove one letter, add another)
 */
export function generateSubstituteMoves(currentWord) {
    const candidates = [];
    const word = currentWord.toUpperCase();
    // Try substituting each position with each letter
    for (let pos = 0; pos < word.length; pos++) {
        const originalLetter = word[pos];
        for (const newLetter of COMMON_LETTERS) {
            if (newLetter !== originalLetter) {
                const newWord = word.slice(0, pos) + newLetter + word.slice(pos + 1);
                candidates.push({
                    word: newWord,
                    type: 'substitute',
                    operations: [`Substitute ${originalLetter} → ${newLetter} at position ${pos}`]
                });
            }
        }
    }
    return candidates;
}
/**
 * Filters candidates to only include valid dictionary words that human players could use
 *
 * Note: This v0 Greedy bot intentionally plays by human rules for fair gameplay.
 * Future bots could use isBot: true for rule-breaking behavior if desired.
 */
export function filterValidCandidates(candidates) {
    return candidates.filter(candidate => {
        // This bot plays by the same rules as human players for balanced gameplay
        const validation = validateWord(candidate.word, { isBot: false });
        return validation.isValid && isValidDictionaryWord(candidate.word);
    });
}
/**
 * Scores and ranks move candidates
 */
export function scoreCandidates(candidates, currentWord, keyLetters = []) {
    const scoredMoves = [];
    for (const candidate of candidates) {
        const score = getScoreForMove(currentWord, candidate.word, keyLetters);
        // Calculate confidence based on multiple factors
        let confidence = 0.5; // Base confidence
        // Higher confidence for higher scores
        confidence += Math.min(score * 0.2, 0.3);
        // Bonus confidence for using key letters
        const hasKeyLetters = keyLetters.some(key => candidate.word.includes(key.toUpperCase()));
        if (hasKeyLetters) {
            confidence += 0.2;
        }
        // Bonus confidence for common word patterns
        if (candidate.word.length >= 4 && candidate.word.length <= 6) {
            confidence += 0.1;
        }
        // Ensure confidence stays in bounds
        confidence = Math.max(0, Math.min(1, confidence));
        scoredMoves.push({
            word: candidate.word,
            score,
            confidence,
            reasoning: [
                `${candidate.type} operation: ${candidate.operations.join(', ')}`,
                `Score: ${score} points`,
                ...(hasKeyLetters ? ['Uses key letters'] : []),
                `Confidence: ${Math.round(confidence * 100)}%`
            ]
        });
    }
    // Sort by score descending, then by confidence descending
    return scoredMoves.sort((a, b) => {
        if (a.score !== b.score)
            return b.score - a.score;
        return b.confidence - a.confidence;
    });
}
/**
 * Main bot AI function - generates the best move using greedy strategy
 */
export function generateBotMove(currentWord, options = {}) {
    const startTime = performance.now();
    const { keyLetters = [], maxCandidates = 1000, timeLimit = 100 // Allow more time for complex analysis
     } = options;
    let allCandidates = [];
    try {
        // Generate all possible moves
        const addMoves = generateAddMoves(currentWord);
        const removeMoves = generateRemoveMoves(currentWord);
        const rearrangeMoves = generateRearrangeMoves(currentWord);
        const substituteMoves = generateSubstituteMoves(currentWord);
        allCandidates = [
            ...addMoves,
            ...removeMoves,
            ...rearrangeMoves,
            ...substituteMoves
        ];
        // Check time limit
        if (performance.now() - startTime > timeLimit) {
            return {
                move: null,
                candidates: [],
                processingTime: performance.now() - startTime,
                totalCandidatesGenerated: allCandidates.length
            };
        }
        // Filter to valid words only
        const validCandidates = filterValidCandidates(allCandidates);
        // Limit candidates for performance
        const limitedCandidates = validCandidates.slice(0, maxCandidates);
        // Score and rank candidates
        const scoredMoves = scoreCandidates(limitedCandidates, currentWord, keyLetters);
        // Select best move (greedy strategy)
        const bestMove = scoredMoves.length > 0 ? scoredMoves[0] : null;
        const processingTime = performance.now() - startTime;
        return {
            move: bestMove,
            candidates: scoredMoves.slice(0, 10), // Return top 10 for analysis
            processingTime,
            totalCandidatesGenerated: allCandidates.length
        };
    }
    catch (error) {
        console.error('Bot move generation failed:', error);
        return {
            move: null,
            candidates: [],
            processingTime: performance.now() - startTime,
            totalCandidatesGenerated: allCandidates.length
        };
    }
}
/**
 * Simulates multiple bot turns for testing endurance and performance
 */
export function simulateBotGame(initialWord, turns = 100, keyLetters = []) {
    const startTime = performance.now();
    const moves = [];
    const errors = [];
    let currentWord = initialWord;
    let completedTurns = 0;
    try {
        for (let turn = 0; turn < turns; turn++) {
            const result = generateBotMove(currentWord, { keyLetters });
            if (!result.move) {
                errors.push(`Turn ${turn + 1}: No valid move found`);
                break;
            }
            moves.push(result.move);
            currentWord = result.move.word;
            completedTurns++;
            // Prevent infinite loops or stuck states
            if (result.move.score === 0 && turn > 10) {
                // Try to break out of zero-score loops
                const fallbackResult = generateBotMove(currentWord, {
                    keyLetters,
                    maxCandidates: 100
                });
                if (fallbackResult.move && fallbackResult.move.score > 0) {
                    moves.push(fallbackResult.move);
                    currentWord = fallbackResult.move.word;
                }
            }
        }
        const totalTime = performance.now() - startTime;
        const averageTimePerTurn = completedTurns > 0 ? totalTime / completedTurns : 0;
        return {
            success: completedTurns === turns,
            completedTurns,
            totalTime,
            averageTimePerTurn,
            moves,
            errors
        };
    }
    catch (error) {
        errors.push(`Simulation failed: ${error}`);
        const totalTime = performance.now() - startTime;
        return {
            success: false,
            completedTurns,
            totalTime,
            averageTimePerTurn: completedTurns > 0 ? totalTime / completedTurns : 0,
            moves,
            errors
        };
    }
}
/**
 * Performance test for bot move generation
 */
export function performanceTestBot(iterations = 100) {
    const testWords = ['CAT', 'HELLO', 'WORLD', 'GAME', 'PLAY', 'WORD', 'TEST'];
    let totalTime = 0;
    let successes = 0;
    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
        const testWord = testWords[i % testWords.length];
        const result = generateBotMove(testWord, { maxCandidates: 100 });
        totalTime += result.processingTime;
        if (result.move)
            successes++;
    }
    return {
        averageTime: totalTime / iterations,
        totalTime: performance.now() - startTime,
        successRate: successes / iterations
    };
}
/**
 * Helper function to analyze bot decision-making
 */
export function explainBotMove(currentWord, keyLetters = [], showTop = 5) {
    const result = generateBotMove(currentWord, { keyLetters });
    const reasoning = [
        `Analyzed ${result.totalCandidatesGenerated} possible moves`,
        `Processing completed in ${result.processingTime.toFixed(2)}ms`,
        `Found ${result.candidates.length} valid candidates`
    ];
    if (result.move) {
        reasoning.push(`Selected move: ${currentWord} → ${result.move.word} (${result.move.score} points)`);
        reasoning.push(...result.move.reasoning);
    }
    else {
        reasoning.push('No valid moves found');
    }
    const analysis = reasoning.join('\n');
    const topMoves = result.candidates.slice(0, showTop);
    return {
        analysis,
        topMoves,
        reasoning
    };
}
