import TelegramBot from 'node-telegram-bot-api';

import config from '../config';

export class TelegramBotService {
  private bot: TelegramBot;

  constructor(token: string) {
    // Initialize the Telegram bot with the provided API token
    this.bot = new TelegramBot(token, { polling: true });

    // Set up event listeners for incoming messages and errors
    this.bot.on('message', this.handleIncomingMessage);
    this.bot.on('polling_error', (err: Error) => {
      console.error('Polling error:', err);
    });
  }

  /**
   * Sends a message to a specified Telegram chat.
   * @param {number} chatId - The ID of the chat to send the message to.
   * @param {string} message - The message to send.
   * @returns {Promise<any>} A Promise that resolves with the message object if successful, or rejects with an error if unsuccessful.
   */
  public sendMessage(
    chatId: number,
    message: string
  ): Promise<TelegramBot.Message> {
    return this.bot.sendMessage(chatId, message);
  }

  /**
   * Handles incoming messages to the Telegram bot.
   * @param {TelegramBot.Message} message - The incoming message object.
   */
  private handleIncomingMessage(message: TelegramBot.Message): void {
    // Do something with the incoming message, e.g. log it or respond to it
    console.log(
      `Received message from ${message.from?.first_name} (${message.chat.id}): ${message.text}`
    );
  }
}

export default new TelegramBotService(config.TELEGRAM_BOT_TOKEN);
