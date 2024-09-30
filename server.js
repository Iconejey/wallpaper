const express = require('express');
const app = express();

app.use(express.static('public'));

app.listen(8011, () => console.log('Server running on port 8011'));
