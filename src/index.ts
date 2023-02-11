import { Bot } from './bot';

const db = 'db.json';
const bot = new Bot(process.env.TOKEN);
bot.init(db);
