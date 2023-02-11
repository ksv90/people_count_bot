import http from 'http';
import { Bot } from './bot';

const db = 'db.json';
const bot = new Bot(process.env.TOKEN);
bot.init(db);

const server = http.createServer((_, response) => {
  console.log('bot isLive', bot.isLive());
  response.writeHead(bot.isLive() ? 200 : 500);
  response.end();
});

server.listen(process.env.PORT, () => console.log('Server is running'));
