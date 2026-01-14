require('dotenv').config();
const express = require('express');
const cors = require('cors');

const jobRoutes = require('./routes/job.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/', jobRoutes);

module.exports = app;
