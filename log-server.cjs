const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const LOG_FILE = 'key-letter-stats.log';

// Middleware
app.use(cors());
app.use(express.json());

// Logging endpoint
app.post('/log-key-letter', (req, res) => {
  try {
    const { timestamp, letter, gameId, turnNumber, platform } = req.body;
    
    // Validate required fields
    if (!timestamp || !letter || !gameId || turnNumber === undefined || !platform) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create CSV line
    const csvLine = `${timestamp},${letter.toUpperCase()},${gameId},${turnNumber},${platform}\n`;
    
    // Append to log file
    fs.appendFileSync(LOG_FILE, csvLine);
    
    console.log(`[LOG] Key letter logged: ${letter} (${platform})`);
    res.json({ success: true });
    
  } catch (error) {
    console.error('Logging error:', error);
    res.status(500).json({ error: 'Failed to log entry' });
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
  
  // Create log file with header if it doesn't exist
  if (!fs.existsSync(LOG_FILE)) {
    const header = '# Universal Key Letter Statistics Log\n# Format: TIMESTAMP,LETTER,GAME_ID,TURN_NUMBER,PLATFORM\n# This file tracks every key letter generated across ALL platforms\n# Started: ' + new Date().toISOString().split('T')[0] + '\n';
    fs.writeFileSync(LOG_FILE, header);
    console.log(`📄 Created log file: ${LOG_FILE}`);
  }
}); 