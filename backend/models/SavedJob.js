const mongoose = require('mongoose');

const SavedJobSchema = new mongoose.Schema({
  firebaseUID: { type: String, required: true, index: true },
  jobId: { type: String, required: true },
  jobData: { type: Object, required: true },
  savedAt: { type: Date, default: Date.now }
});

SavedJobSchema.index({ firebaseUID: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model('SavedJob', SavedJobSchema);