const { calculateScore } = require('./packages/engine/scoring.ts');

console.log('Testing POPE → OPE scoring...');
const result = calculateScore('POPE', 'OPE', {});

console.log('Total score:', result.totalScore);
console.log('Breakdown:', result.breakdown);
console.log('Actions:', result.actions);

// Expected: 1 point (remove P)
// Actual: Let's see what we get 