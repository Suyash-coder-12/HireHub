const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authMiddleware');

// --- TEMPORARY IN-MEMORY DATABASE ---
// This array resets whenever the server restarts
let temporaryDatabase = [];

router.use(verifyToken); // Protects these routes

// Save a job
router.post('/', (req, res) => {
  const { jobId, jobData } = req.body;
  const firebaseUID = req.user.uid;

  // Check if user already saved this job
  const existingJob = temporaryDatabase.find(
    job => job.firebaseUID === firebaseUID && job.jobId === jobId
  );

  if (existingJob) {
    return res.status(400).json({ message: 'Job already saved' });
  }

  // Create a new saved job record
  const newSavedJob = {
    _id: Date.now().toString(), // Generate a fake database ID
    firebaseUID,
    jobId,
    jobData,
    savedAt: new Date()
  };

  temporaryDatabase.push(newSavedJob);
  res.status(201).json(newSavedJob);
});

// Get user's saved jobs
router.get('/', (req, res) => {
  const firebaseUID = req.user.uid;
  
  // Filter the array to only show jobs belonging to this specific user
  const userSavedJobs = temporaryDatabase
    .filter(job => job.firebaseUID === firebaseUID)
    .sort((a, b) => b.savedAt - a.savedAt); // Sort newest first

  res.json(userSavedJobs);
});

// Remove a saved job
router.delete('/:id', (req, res) => {
  const jobIdToRemove = req.params.id;
  const firebaseUID = req.user.uid;

  // Keep everything EXCEPT the job we want to delete
  temporaryDatabase = temporaryDatabase.filter(
    job => !(job.jobId === jobIdToRemove && job.firebaseUID === firebaseUID)
  );

  res.json({ message: 'Job removed' });
});

module.exports = router;