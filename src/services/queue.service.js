const pool = require('../config/database');

/**
 * Pega o próximo job da fila.
 * Regra:
 * - apenas 1 job pode ficar em `in_progress`
 * - usa lock do Postgres (SKIP LOCKED)
 */
async function getNextJob() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1) Se já tem job em andamento, não tenta pegar outro
        const inProg = await client.query(
            `SELECT 1 FROM jobs WHERE status = 'in_progress' LIMIT 1`
        );

        if (inProg.rowCount > 0) {
            await client.query('COMMIT');
            return null;
        }

        // 2) Pega um pendente e trava ele
        const next = await client.query(`
      SELECT id, url, message
      FROM jobs
      WHERE status = 'pending'
      ORDER BY created_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `);

        if (next.rowCount === 0) {
            await client.query('COMMIT');
            return null;
        }

        const job = next.rows[0];

        // 3) Marca em andamento (a constraint garante 1 só)
        await client.query(
            `UPDATE jobs
       SET status = 'in_progress', updated_at = NOW()
       WHERE id = $1`,
            [job.id]
        );

        await client.query('COMMIT');
        return job;

    } catch (err) {
        await client.query('ROLLBACK');

        // 4) Se estourou a constraint, trate como "já tem um rodando"
        if (err?.code === '23505' && err?.constraint === 'one_job_in_progress') {
            return null;
        }
        throw err;
    } finally {
        client.release();
    }
}


/**
 * Finaliza um job com sucesso
 */
async function finishJob(jobId) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `
      UPDATE jobs
      SET status = 'done',
          updated_at = NOW()
      WHERE id = $1
        AND status = 'in_progress'
      RETURNING *
      `,
            [jobId]
        );

        if (result.rowCount === 0) {
            throw new Error(`Job ${jobId} não encontrado ou não está em execução`);
        }

        await client.query('COMMIT');
        return result.rows[0];

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Marca job como falha (opcional, mas recomendado)
 */
async function failJob(jobId, reason = null) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `
      UPDATE jobs
      SET status = 'failed',
          error = $2,
          updated_at = NOW()
      WHERE id = $1
        AND status = 'in_progress'
      RETURNING *
      `,
            [jobId, reason]
        );

        if (result.rowCount === 0) {
            throw new Error(`Job ${jobId} não encontrado ou não está em execução`);
        }

        await client.query('COMMIT');
        return result.rows[0];

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function cleanupPendingAndInProgress() {
  // 1) Buscar IDs no banco (pra tentar remover da fila pelo mesmo ID, se você tiver essa ligação)
  const rows = await db("jobs")
    .select("id")
    .whereIn("status", ["pending", "in_progress"]);

  const jobIds = rows.map((r) => r.id);

  // 2) Limpar/remover jobs da fila
  // OBS: isso depende do provider. Vou deixar um método no queueService
  const queue = await queueService.cleanByJobIds(jobIds);

  // 3) Deletar do banco
  const deletedCount = await db("jobs")
    .whereIn("status", ["pending", "in_progress"])
    .del();

  return {
    deletedCount,
    queue,
  };
}

module.exports = {
    getNextJob,
    finishJob,
    failJob,
    cleanupPendingAndInProgress
};
