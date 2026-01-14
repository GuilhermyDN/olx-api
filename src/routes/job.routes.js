const express = require('express');
const router = express.Router();

const jobController = require('../controllers/job.controller');

router.post('/jobs', jobController.createJob);
router.post('/jobs/next', jobController.nextJob);
router.post('/jobs/finish', jobController.completeJob);

module.exports = router;
