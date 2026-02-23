const express = require('express');
const router = express.Router();

const jobController = require('../controllers/job.controller');
const authMiddleware = require("../middlewares/auth.middleware");

router.post('/jobs', jobController.createJob);
router.post('/jobs/next', jobController.nextJob);
router.post('/jobs/finish', jobController.completeJob);
router.delete("/jobs/cleanup", jobController.cleanupJobs);

module.exports = router;
