require('dotenv').config();

const fs = require('fs');
const crypto = require('crypto');
const _ = require('lodash');

const Discord = require('discord.js');
const GoogleTTS = require('node-google-tts-api');

const bibleApi = require('./bibleApi');

const tts = new GoogleTTS();

const getRandomVerse = async (books) => {
  const chapterIds = books.data.map((book) => book.chapters).flat();
  const randomChapter = _.sample(chapterIds);
  const randomChapterID = randomChapter.id;

  const chapterNumber = randomChapter.number;
  const bookName = books.data.find((book) => book.id === randomChapter.bookId)
    .nameLong;

  let verses = await bibleApi.fetchVerses(randomChapterID);
  verses = verses.data.flat();
  const randomVerse = _.sample(verses);

  const verseNumber = randomVerse.id.split('.').pop();

  const myVerse = await bibleApi.fetchVerseContent(randomVerse.id);
  return {
    content: myVerse.data.content.trim(),
    bookName,
    chapterNumber,
    verseNumber,
  };
};

const getSHA256 = (input) => {
  return crypto.createHash('sha256').update(input).digest('hex');
};

const main = async () => {
  console.log('Starting BibleBot for Discord....');

  console.log('Creating TTS directory');
  fs.mkdirSync('./tts', { recursive: true });

  console.log('Initializing Discord Client');
  const client = new Discord.Client();

  console.log('Pre-fetching books from bible API');
  const books = await bibleApi.fetchBooks();

  client.on('ready', () => {
    console.log(`Logged in to Discord as ${client.user.tag}!`);
  });

  client.on('message', async (msg) => {
    if (msg.content === '!bible') {
      const bibleResult = await getRandomVerse(books);
      msg.reply(
        `${bibleResult.content} ~ ${bibleResult.bookName}, Kapitel ${bibleResult.chapterNumber}, Vers ${bibleResult.verseNumber}`,
      );
    }

    if (msg.content === '!biblejoin') {
      if (msg.member.voice.channel) {
        const bibleResult = await getRandomVerse(books);
        const text = `${bibleResult.bookName}, Kapitel ${bibleResult.chapterNumber}, Vers ${bibleResult.verseNumber} lautet: ${bibleResult.content}. Amen!`;
        const ttsResult = await tts.get({
          text,
          lang: 'de',
          limit_bypass: text.length >= 200,
        });

        // If the result length is less than 200 chars we get a string/buffer, otherwise an array
        const data = _.isArray(ttsResult) ? tts.concat(ttsResult) : ttsResult;

        const path = `./tts/${getSHA256(data)}.mp3`;
        if (!fs.existsSync(path)) {
          fs.writeFileSync(path, data);
        }

        msg.reply(
          `${bibleResult.content} ~ ${bibleResult.bookName}, Kapitel ${bibleResult.chapterNumber}, Vers ${bibleResult.verseNumber}`,
        );
        msg.member.voice.channel.join().then((connection) => {
          const dispatcher = connection.play(path);
          dispatcher.on('finish', () => {
            dispatcher.destroy();
            connection.disconnect();
          });
        });
      } else {
        msg.reply('Du bist nicht im Channel');
      }
    }
  });
  client.login(process.env.DISCORD_BOT_TOKEN);
};

main();
