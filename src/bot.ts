import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { Context, Markup, Middleware, Telegraf } from 'telegraf';
import type { User } from 'telegraf/typings/core/types/typegram';

const SUBSCRIBE = 'subscribe';
const UNSUBSCRUBE = 'unsubscribe';

function checkCommand<T extends Context>(ctx: T, ...messages: ReadonlyArray<string>) {
  if (!!ctx.message && 'text' in ctx.message) {
    const text = ctx.message.text.toLowerCase();
    return messages.some((m) => m === text);
  }
  return false;
}

function getUser({ first_name, last_name, username }: User, i: number): string {
  return `${i + 1}. ${first_name ?? ''} ${last_name ?? ''} ${username ? '<' + username + '>' : ''}`;
}

export class Bot<TContext extends Context> {
  private live = true;

  private bot: Telegraf<TContext>;

  private list = new Array<User>();

  private db = '';

  constructor(token: string | undefined) {
    if (!token) throw new Error('Token not found');
    this.bot = new Telegraf(token);
    this.bot.catch(() => this.remove());
    this.bot.action(SUBSCRIBE, this.subscribe);
    this.bot.action(UNSUBSCRUBE, this.unsubscribe);
    this.bot.use(this.applicationMiddleware());
    this.bot.use(this.getResultMiddleware());
  }

  async init(db: string): Promise<void> {
    this.db = path.join(process.cwd(), db);
    this.list = JSON.parse(await readFile(this.db, { encoding: 'utf-8' }));
    process.once('SIGINT', () => this.remove('SIGINT'));
    process.once('SIGTERM', () => this.remove('SIGTERM'));
    try {
      console.info('Bot started!');
      await this.bot.launch();
    } catch {
      this.remove();
    }
  }

  remove(text?: string): void {
    console.info('Bot stopped!');
    this.live = false;
    this.bot.stop(text);
  }

  isLive(): boolean {
    return this.live;
  }

  private subscribe = <T extends Context>(ctx: T) => {
    if (!ctx.from) return ctx.editMessageText('Имя пользователя не установлено');
    if (!this.list.find((user) => user.id === ctx.from?.id)) this.list.push(ctx.from);
    ctx.editMessageText(`${ctx.from.first_name}, вы подписались на поездку`);
    writeFile(this.db, JSON.stringify(this.list));
  };

  private unsubscribe = <T extends Context>(ctx: T) => {
    if (!ctx.from) return ctx.editMessageText('Имя пользователя не установлено');
    this.list = this.list.filter((user) => user.id !== ctx.from?.id);
    ctx.editMessageText(`${ctx.from.first_name}, ваш ответ установлен, трансфер вам не нужен`);
    writeFile(this.db, JSON.stringify(this.list));
  };

  private applicationMiddleware(): Middleware<TContext> {
    return (ctx, next) => {
      if (!checkCommand(ctx, 'p', 'з', 'заявка', '/start')) return next();
      ctx.reply(
        'Выберите действие',
        Markup.inlineKeyboard([
          Markup.button.callback('Еду', SUBSCRIBE),
          Markup.button.callback('Не еду', UNSUBSCRUBE),
        ]),
      );
    };
  }

  private getResultMiddleware(): Middleware<TContext> {
    return (ctx, next) => {
      if (!checkCommand(ctx, 'результат', 'р', 'h')) return next();
      const list = this.list.map(getUser).join('\n');
      if (list.length) ctx.reply(list);
      else ctx.reply('Никто не подписан на поездку');
    };
  }
}
