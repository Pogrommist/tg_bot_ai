import { Telegraf, session } from 'telegraf'
import { message } from 'telegraf/filters'
import config from 'config'

import { openai } from './openai.js'

const userSession = {}

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))

bot.use(session())

bot.command('new', async ctx => {
  const userId = ctx.message.from.id
  ctx.session = userSession[userId] = { messages: [] }
  ctx.reply('Начинаем заново')
})

bot.on(message('text'), async ctx => {
  if (ctx.message?.chat?.type == 'supergroup' || ctx.message?.chat?.type == 'group') {
    const isReplayToBot = ctx.message?.reply_to_message?.from?.is_bot
    if (!ctx.message.text.includes('@strmrg_bot') && !isReplayToBot) return
    handleTextMessage(ctx)
  } else {
    handleTextMessage(ctx)
  }
})

const handleTextMessage = async ctx  => {
  const userId = ctx.message.from.id
  if (!userSession[userId]) {
    userSession[userId] = { messages: [] }
  }

  ctx.session = userSession[userId].messages
  userSession[userId].messages.push({ role: openai.roles.USER, content: ctx.message.text })
  const response = await openai.chat(userSession[userId].messages)
  userSession[userId].messages.push({ role: openai.roles.ASSISTANT, content: response.content })
  
  await ctx.reply(response.content, { reply_to_message_id: ctx.message.message_id })
  if (userSession[userId].messages.length >= 10) clearCtx(ctx, userSession, userId)
}

const clearCtx = async (ctx, userSession, userId) => {
  userSession[userId] = { messages: [] }
  ctx.reply("Слишком много сообщений. Чищу историю 🧽", { reply_to_message_id: ctx.message.message_id })
}

bot.command('start', async (ctx) => {
  const userFirstName = ctx.message.from.first_name
  await ctx.reply(`${userFirstName}, пообщаемся?`)
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))