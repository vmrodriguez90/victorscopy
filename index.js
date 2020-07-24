
const botToken = process.env.TELEGRAM_TOKEN || '1295664824:AAFT0FL_IulLhy9ZO-9AjH23opBf6Lvyt4s';
const telegramFileURL = process.env.TELEGRAMURL || 'https://api.telegram.org/file/bot';
const telegramURL = process.env.TELEGRAMFILEURL || 'https://api.telegram.org/bot';
const fileName = process.env.FILE_NAME || 'fileToVideoNote.mp4';

const { Bot } = require('tgapi')
const fs = require('fs')
const https = require('https')
const request = require('request');

const bot = new Bot(botToken);

const polling = bot.polling({
    limit: 7776000,
    timeout: 7776000,  
  });
  

polling.on('message', onUpdate);

async function onUpdate(message) { 
    console.log('Message', message);
    let chatData = message.chat;
    if (message && message.video) {
        let video = message.video;
        if(!checkVideo(video)) {
            let message = await bot.sendMessage({chat_id: chatData.id, text: "Oh no, the video is not 1:1 ratio or the size is bigger than 8mb"});
            return;
        }
        console.log('Video File Id: ', video.file_id);
        bot.getFile({ file_id: video.file_id}).then((file) => {
            if (file && file.result && file.result.file_path) {
                console.log('file path: ', file.result.file_path);
                getFileAndSaveIt(file.result.file_path).then((stream) => {
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
    let options = {
        'method': 'POST',
        'url': `${telegramURL}${botToken}/sendVideoNote?`,
        formData: {
            'chat_id': chatId,
            'video_note': {
                'value': fs.createReadStream(`./${fileName}`),
                'options': {
                    'filename': fileName,
                    'contentType': 'video/mp4'
                }
            }
        }
    };
    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        
        let videoResponse = JSON.parse(body);
        console.log('VideoNote sent successfully: ', videoResponse);
        if (videoResponse.ok && videoResponse.result ) {
            console.log('Video Note: ', videoResponse.result.video_note );
            let videoNote = videoResponse.result.video_note;
            sendFinalMessage(chatId, videoNote);
        }
    });
}
async function sendFinalMessage(chatId, videoNote) {
    let message = await bot.sendMessage({ 
        chat_id: chatId, 
        parse_mode: 'HTML',
        text: `Video Note Sent!\n ID: <pre>${videoNote.file_id}</pre> duration: ${videoNote.duration}`
    });

    console.log(message);
}

async function getFileAndSaveIt(path) {
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
    // let ratio = video.width/video.height;
    // if (ratio > 1.2 ) {
    //     return false;
    // }
    if (video.mime_type !== 'video/mp4') {
        console.error('MimeType not mp4 but: ', video.mime_type);
        return false;
    }
    if (video.file_size >= 8389000) {
        console.error('File Size is more than 8mb: ', video.file_size);
        return false;
    }

    return true;
}

