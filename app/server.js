const express = require('express');
const sql = require('mssql');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let pool;
async function getPool() {
  if (!pool) {
    pool = await sql.connect(process.env.SQL_CONNECTION_STRING);
    await pool.request().query(`
      IF OBJECT_ID('dbo.Users','U') IS NULL
      CREATE TABLE dbo.Users (
        Id INT IDENTITY PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Email NVARCHAR(255) NOT NULL)`);
  }
  return pool;
}

const wrap = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (e) { res.status(500).json({ error: e.message }); }
};
const valid = b => b && typeof b.name === 'string' && b.name.trim() &&
                   typeof b.email === 'string' && b.email.includes('@');

app.get('/health', wrap(async (_, res) => {
  await (await getPool()).request().query('SELECT 1');
  res.json({ db: 'connected' });
}));

app.get('/api/users', wrap(async (_, res) => {
  const r = await (await getPool()).request().query('SELECT Id, Name, Email FROM dbo.Users ORDER BY Id');
  res.json(r.recordset);
}));

app.post('/api/users', wrap(async (req, res) => {
  if (!valid(req.body)) return res.status(400).json({ error: 'Name and a valid email are required' });
  const r = await (await getPool()).request()
    .input('n', sql.NVarChar(100), req.body.name.trim())
    .input('e', sql.NVarChar(255), req.body.email.trim())
    .query('INSERT INTO dbo.Users (Name, Email) OUTPUT INSERTED.* VALUES (@n, @e)');
  res.status(201).json(r.recordset[0]);
}));

app.put('/api/users/:id', wrap(async (req, res) => {
  if (!valid(req.body)) return res.status(400).json({ error: 'Name and a valid email are required' });
  const r = await (await getPool()).request()
    .input('id', sql.Int, req.params.id)
    .input('n', sql.NVarChar(100), req.body.name.trim())
    .input('e', sql.NVarChar(255), req.body.email.trim())
    .query('UPDATE dbo.Users SET Name=@n, Email=@e WHERE Id=@id');
  res.sendStatus(r.rowsAffected[0] ? 204 : 404);
}));

app.delete('/api/users/:id', wrap(async (req, res) => {
  const r = await (await getPool()).request()
    .input('id', sql.Int, req.params.id)
    .query('DELETE FROM dbo.Users WHERE Id=@id');
  res.sendStatus(r.rowsAffected[0] ? 204 : 404);
}));

app.listen(process.env.PORT || 8080);