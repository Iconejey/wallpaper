const express = require('express');
const fs = require('fs');
const app = express();

app.get('/imgs/:dominant', (req, res) => {
	try {
		const dominant = req.params.dominant;
		const imgs = fs.readdirSync(`public/${dominant}_dominant`);
		res.send(imgs);
	} catch (e) {
		res.status(404).send('dominant not found');
	}
});

app.use(express.static('public'));

app.listen(8011, () => console.log('Server running on port 8011'));
