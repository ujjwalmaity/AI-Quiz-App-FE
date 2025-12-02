// server.js (Serving your compiled Angular files)

const express = require('express');
const path = require('path');
const app = express();

// Use the PORT variable provided by Cloud Run
const PORT = process.env.PORT || 8080;

// CRITICAL: Point to your compiled Angular files
const DIST_FOLDER = path.join(process.cwd(), 'dist/ai-quiz-frontend/browser'); // <--- Update this folder name

app.use(express.static(DIST_FOLDER));
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_FOLDER, 'index.html'));
});

// Listen on the dynamic PORT and the required HOST
app.listen(PORT, () => {
  console.log(`Angular App listening on ${PORT}`);
});
