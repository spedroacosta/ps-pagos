import express from 'express';
const app = express();
app.get('/api/test-headers', (req, res) => {
  console.log(req.headers);
  res.json(req.headers);
});
app.listen(3001, () => console.log('Listening on 3001'));
