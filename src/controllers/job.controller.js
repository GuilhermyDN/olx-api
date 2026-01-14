const queueService = require('../services/queue.service');

async function nextJob(req, res) {
  try {
    const job = await queueService.getNextJob();

    if (!job) {
      return res.status(204).send();
    }

    return res.json({
      id: job.id,
      url: job.url,
      message: job.message
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar próximo job' });
  }
}

const { finishJob } = require('../services/queue.service');

async function completeJob(req, res) {
  const { id } = req.body;

  if (!id) return res.status(400).json({ error: 'Job ID obrigatório' });

  try {
    const job = await finishJob(id);
    return res.status(200).json({ ok: true, job });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

async function createJob(req, res) {
  const { url, message } = req.body;

  if (!url || !message) {
    return res.status(400).json({ error: 'url e message são obrigatórios' });
  }

  try {
    // Ajuste os campos conforme sua tabela jobs
    const result = await require('../config/database').query(
      `
      INSERT INTO jobs (url, message, status, created_at, updated_at)
      VALUES ($1, $2, 'pending', NOW(), NOW())
      RETURNING id, url, message, status
      `,
      [url, message]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao criar job' });
  }
}



module.exports = {
  nextJob,
  completeJob,
  createJob
};
