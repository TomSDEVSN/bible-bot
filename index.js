require('dotenv').config();

const Discord = require('discord.js');
const googleTTS = require('node-google-tts-api');
const tts = new googleTTS();
const fs = require('fs');
const crypto = require('crypto');
const _ = require('lodash');

const bibleApi = require('./bibleApi');

async function randomVerse(books) {
    const chapterIds = books.data.map(book => book.chapters.map(chapter => chapter.id)).flat();
    const randomChapterID = _.sample(chapterIds);

    const verses = await bibleApi.fetchVerses(randomChapterID);
    const verseIds = verses.data.map(verse => verse.id).flat();
    const randomVerse = _.sample(verseIds);

    const myVerse = await bibleApi.fetchVerseContent(randomVerse);
    return myVerse.data.content.trim();
}

function getSHA256(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
}

const main = async () => {

    console.log("Starting BibleBot for Discord....");

    console.log("Creating TTS directory");
    fs.mkdir("./tts", function(err) {});

    console.log("Initializing Discord Client");
    const client = new Discord.Client();

    console.log("Pre-fetching books from bible API");
    const books = await bibleApi.fetchBooks();

    client.on('ready', () => {
      console.log(`Logged in to Discord as ${client.user.tag}!`);
    });

    client.on('message', async msg => {
      if (msg.content === '!bible') {
        msg.reply(await randomVerse(books));
      }

      if (msg.content === '!biblejoin') {
        if (msg.member.voice.channel) {
	  const text = await randomVerse(books);
          tts.get({
		  text: text,
		  lang: 'de',
		  limit_bypass: (text >= 200) ? true : false
	  }).then(arr => {
	      const data = (arr >= 200) ? tts.concat(arr) : arr;
              const path = './tts/' + getSHA256(data) + '.mp3';
	      if (!fs.existsSync(path)) {
	          fs.writeFileSync(path, data);
	      }
	      msg.member.voice.channel.join().then(connection => {
		  const dispatcher = connection.play(path);
		  dispatcher.on('finish', () => {
			  dispatcher.destroy();
			  connection.disconnect();
		  });
	      });
          });
        } else {
          msg.reply("Du bist nicht im Channel");
        }
      }
    });
    client.login(process.env.DISCORD_BOT_TOKEN);
}

main();
