const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');

dotenv.config();

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebaseServiceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/saved-jobs', require('./routes/savedJobs'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} (Using In-Memory Database)`));