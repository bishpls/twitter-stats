import { startServer } from '../src/visualize/server.mjs';

const port = parseInt(process.env.PORT) || 3000;
startServer(port);
