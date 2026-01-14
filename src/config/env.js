// src/config/env.js
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

function resolveEnvPath() {
  // quando empacotado (pkg), o executável fica em process.execPath
  const exeDir = path.dirname(process.execPath);
  const envNextToExe = path.join(exeDir, ".env");

  // durante desenvolvimento, use o .env do projeto
  const envInProject = path.join(process.cwd(), ".env");

  if (fs.existsSync(envNextToExe)) return envNextToExe;
  return envInProject;
}

dotenv.config({ path: resolveEnvPath() });

module.exports = {
  PORT: process.env.PORT || 3000,
  // exporte aqui o que você usa no resto do projeto
};
