const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const LOG_FILE = 'key-letter-counts.txt';

// Middleware
app.use(cors());
app.use(express.json());

// Read current counts from file
function readCounts() {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return {};
    }
    
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    const counts = {};
    
    // Parse the simple format: "A: 5"
    const lines = content.split('\n').filter(line => line.trim());
    for (const line of lines) {
      const match = line.match(/^([A-Z]):\s*(\d+)$/);
      if (match) {
        counts[match[1]] = parseInt(match[2], 10);
      }
    }
    
    return counts;
  } catch (error) {
    console.error('Failed to read counts:', error);
    return {};
  }
}

// Write counts to file
function writeCounts(counts) {
  try {
    // Sort letters alphabetically
    const sortedLetters = Object.keys(counts).sort();
    
    // Create content in simple format
    const lines = sortedLetters.map(letter => `${letter}: ${counts[letter]}`);
    const content = lines.join('\n') + '\n';
    
    // Write to file
    fs.writeFileSync(LOG_FILE, content);
  } catch (error) {
    console.error('Failed to write counts:', error);
  }
}

// Logging endpoint
app.post('/log-key-letter', (req, res) => {
  try {
    const { letter } = req.body;
    
    // Validate required fields
    if (!letter) {
      return res.status(400).json({ error: 'Missing letter field' });
    }
    
    const upperLetter = letter.toUpperCase();
    
    // Read current counts
    const counts = readCounts();
    
    // Increment the count for this letter
    counts[upperLetter] = (counts[upperLetter] || 0) + 1;
    
    // Write back to file
    writeCounts(counts);
    
    console.log(`[LOG] Key letter count updated: ${upperLetter} = ${counts[upperLetter]}`);
    res.json({ success: true, letter: upperLetter, count: counts[upperLetter] });
    
  } catch (error) {
    console.error('Logging error:', error);
    res.status(500).json({ error: 'Failed to log entry' });
  }
});

// Get current counts endpoint
app.get('/counts', (req, res) => {
  try {
    const counts = readCounts();
    res.json(counts);
  } catch (error) {
    console.error('Error reading counts:', error);
    res.status(500).json({ error: 'Failed to read counts' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', logFile: LOG_FILE });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Key Letter Logging Server running on http://localhost:${PORT}`);
  console.log(`📝 Writing to: ${path.resolve(LOG_FILE)}`);
  
  // Create empty counts file if it doesn't exist
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '');
    console.log(`📄 Created counts file: ${LOG_FILE}`);
  }
}); 