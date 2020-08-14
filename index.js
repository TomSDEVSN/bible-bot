require('dotenv').config();

const Discord = require('discord.js');
const _ = require('lodash');

const bibleApi = require('./bibleApi');


const main = async () => {

    console.log("Starting BibleBot for Dicord....")

    const client = new Discord.Client();

    console.log("Pre-fetching books from bible API").
    const books = await bibleApi.fetchBooks();

    client.on('ready', () => {
      console.log(`Logged in to Discord as ${client.user.tag}!`);
    });
    
    client.on('message', async msg => {
      if (msg.content === '!bible') {

        const chapterIds = books.data.map(book => book.chapters.map(chapter => chapter.id)).flat();
        const randomChapterID = _.sample(chapterIds);

        const verses = await bibleApi.fetchVerses(randomChapterID);
        const verseIds = verses.data.map(verse => verse.id).flat();
        const randomVerse = _.sample(verseIds);

        const myVerse = await bibleApi.fetchVerseContent(randomVerse);
        msg.reply(myVerse.data.content.trim());
      }
    });
    
    client.login(process.env.DISCORD_BOT_TOKEN);
}

main();