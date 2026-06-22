import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { AnalysisController } from './controllers/analysis.controller.js';
import { ClausierController } from './controllers/clausier.controller.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for frontend client port (e.g. 3000, 5173, etc)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-password']
}));

app.use(express.json());

// Setup Multer for memory upload handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB file size limit
  }
});

// App Routes
app.post('/api/analyze', upload.single('file'), AnalysisController.analyze);
app.post('/api/detect-language', upload.single('file'), AnalysisController.detectLanguage);
app.get('/api/reference', AnalysisController.getReferenceData);

// Admin Routes
app.post('/api/admin/verify', ClausierController.verify);
app.get('/api/admin/clauses', ClausierController.verifyAdmin, ClausierController.getClauses);
app.post('/api/admin/clauses', ClausierController.verifyAdmin, ClausierController.createClause);
app.put('/api/admin/clauses/:id', ClausierController.verifyAdmin, ClausierController.updateClause);
app.patch('/api/admin/clauses/:id/deactivate', ClausierController.verifyAdmin, ClausierController.deactivateClause);
app.patch('/api/admin/clauses/:id/reactivate', ClausierController.verifyAdmin, ClausierController.reactivateClause);

// Basic Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: {
      port,
      model: process.env.OLLAMA_MODEL || 'mistral',
      ollamaUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434'
    }
  });
});

// Global error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'An unexpected server error occurred.' });
});

// Start listening
app.listen(port, () => {
  console.log(`========================================`);
  console.log(` NDA Analyzer Server running on port ${port}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Ollama Target: ${process.env.OLLAMA_API_URL || 'http://localhost:11434'}`);
  console.log(` Ollama Model: ${process.env.OLLAMA_MODEL || 'mistral'}`);
  console.log(`========================================`);
});
