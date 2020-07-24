
const botToken = '1295664824:AAFT0FL_IulLhy9ZO-9AjH23opBf6Lvyt4s';
const cloudConverterToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjQ3ZjVjZmZlOTQzN2ZjZjY2MmMzMDQxZDUzYjg2M2E0Y2E3YTBmZmEwZDUxNjc0ZmRmZjAyNmJhMmM0ODllY2RjMTJlNGM3ZjJmOTU5Yjk1In0.eyJhdWQiOiIxIiwianRpIjoiNDdmNWNmZmU5NDM3ZmNmNjYyYzMwNDFkNTNiODYzYTRjYTdhMGZmYTBkNTE2NzRmZGZmMDI2YmEyYzQ4OWVjZGMxMmU0YzdmMmY5NTliOTUiLCJpYXQiOjE1OTU1MDc2NjAsIm5iZiI6MTU5NTUwNzY2MCwiZXhwIjo0NzUxMTgxMjYwLCJzdWIiOiI0Mzc3MTEyNCIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ1c2VyLndyaXRlIiwidGFzay5yZWFkIiwidGFzay53cml0ZSIsIndlYmhvb2sucmVhZCIsInByZXNldC5yZWFkIiwid2ViaG9vay53cml0ZSIsInByZXNldC53cml0ZSJdfQ.bgvjtZIN0C062XAtDc6s1lnmuuV68XhU1lU7qRzElXJZwH9_t0d8tgiS12ZCz8rg7ricpjtvcXpSM9_WeeU4FdvwFGnxZTcxsXrdKSaPQXLJhkcDr6EEt9V2abD6eXv_QEVpxMwYEct0Kf-rAw1QPifhFU1zl0Lyzzu2ANG1_d-l8iUfVZwGe3gNKiO2i3FtOYD1UGYqY2kRvWj-1XZNgmdCus7VIwDMBcKunJqyaflxSeG7F0U4afMsy2sXWGKpk9VFthEcVebACTGYR1o7wAnJH45LQo_2fpxF8WV2_lJibEO9iu2_XrIoCrEPNce5m9PiroMQt5YTggtz_FYjhttS3QMCr45upx041bEJqNyjN4UYqYrVs4AahEjaTru7i20hX6CoTt523lOhUgRCFdxWfXCzKgWlrML3nZDV7dzdnl9BV3f2mWGLQAwz9c_M6qdKs-UaaaGTfjTNOFZNkJtwMNTIvpUWlxej_VXy6ep6ykVEjPspf8vxD6Yu9ttVgU18c3qUTWfL8XZkdUNY4ESX6gsith6d7W4Yes7P29KS9jTPKUwdml_napAY4aZTic6Dpnc5fOBUSQ1xq_CYMdnXB4FZY5hRG_Xkd8E0WpHxd1obKx0Ur1ELRS26es99IGI0MmXJL-3zPxyxpiL83PNL2soHbGlo_DSQjeuncgA';
const telegramFileURL = 'https://api.telegram.org/file/bot';
const fileName = 'fileToVideoNote.mp4';

const CloudConvert = require('cloudconvert');
const { Bot } = require('tgapi')
const fs = require('fs')
const https = require('https')
const stream = require('stream');

const cloudConvert = new CloudConvert(cloudConverterToken);

const bot = new Bot(botToken);

const polling = bot.polling({
    limit: 50,
    timeout: 60,
  })
  
polling.on('message', onUpdate);

async function onUpdate(message) { 
    console.log('Message', message);
    let chatData = message.chat;
    if (message && message.video) {
        let video = message.video;
        if(!checkVideo(video)) {
            await bot.sendMessage({chat_id: chatData.id, text: "Oh no, the video is not 1:1 ratio or the size is bigger than 8mb"});
            return;
        }
        console.log('Video File Id: ', video.file_id);
        bot.getFile({ file_id: video.file_id}).then((file) => {
            if (file && file.result && file.result.file_path) {
                console.log('file path: ', file.result.file_path);
                getFileStream(file.result.file_path).then((stream) => {
                    bot.sendChatAction({
                        chat_id: chatData.id,
                        action: 'record_video_note'
                    })
                    sendVideoNote(chatData.id);
                }, (error) => {
                    console.error('Error Stream', error);
                });
                
            }
        }, (err) =>  { 
            console.error(err);
            bot.sendMessage({ chat_id: chatData.id, text: "There was an error my friend :("});
        });
    }
}
async function sendVideoNote(chatId) {
    let videoNote = await bot.sendVideoNote({ chat_id: chatId, video_note:  });
    console.log('Video Note sent: ', videoNote);
}

async function getFileStream(path) {
    let url = `${telegramFileURL}${botToken}/${path}`
    console.log('URL File: ', url);
    const writeStream = fs.createWriteStream('./' + fileName);
    
    https.get(url, function (response) {
        response.pipe(writeStream);
    });
    
    await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });
    
    return true;
}

function checkVideo(video) {
    let ratio = video.width/video.height;
    if (ratio > 1.2 ) {
        return false;
    }
    if (video.file_size >= 8389000) {
        return false;
    }

    return true;
}

