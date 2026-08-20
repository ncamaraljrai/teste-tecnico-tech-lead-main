import { createApp } from './app.js';
import { pool } from './db.js';

const port = process.env.PORT || 3000;
const server = createApp().listen(port, () => console.log(JSON.stringify({ event: 'api_started', port })));

async function shutdown(signal) {
	console.log(JSON.stringify({ event: 'api_shutdown', signal }));
	server.close(async () => {
		await pool.end();
		process.exit(0);
	});
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));