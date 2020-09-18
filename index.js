
var botToken = process.env.TELEGRAM_TOKEN || '1295664824:AAFT0FL_IulLhy9ZO-9AjH23opBf6Lvyt4s';
const telegramFileURL = process.env.TELEGRAMURL || 'https://api.telegram.org/file/bot';
const telegramURL = process.env.TELEGRAMFILEURL || 'https://api.telegram.org/bot';
const fileName = process.env.FILE_NAME || 'fileToVideoNote.mp4';

const { Bot } = require('tgapi')
const fs = require('fs')
const https = require('https')
const request = require('request');
var express = require('express');
var moment = require('moment-timezone');
var app = express();
var bodyParser = require('body-parser');
const { post } = require('request');
var bot = new Bot('');
// parse various different custom JSON types as JSON
app.use(bodyParser.json())

app.post('/api/file', async function (req, res) {
    let bodyRequest = req.body;
    bot = new Bot(bodyRequest.token);
    botToken = bodyRequest.token;
    let fileUrl = bodyRequest.file_url;
    let chatId = bodyRequest.chat_id;
    
    console.log('Params: ', fileUrl, chatId);
    await bot.sendMessage({ 
        chat_id: chatId,
        text: `File URL: ${bodyRequest.file_url} File ID: ${bodyRequest.file_id}`
    });
    console.log(`File URL: ${bodyRequest.file_url} File ID: ${bodyRequest.file_id}`);
    await getFileAndSaveIt(fileUrl).then(async (stream) => {
        console.log('Aca entro!');
        await bot.sendChatAction({
            chat_id: chatId,
            action: 'record_video_note'
        })
        await sendVideoNote(chatId);
        res.send("Hasta aca todo bien");
    }, (error) => {
        console.error('Error Stream', error);
        res.send("Error Stream");
    });
});

app.post('/api/convertDate', async function (req, res) {
    let bodyRequest = req.body;
    let received = moment(bodyRequest.date_received, 'hh:mm:ss').hour();
    
    let now = moment().utc();
    console.log('Now Hour:', now.hour());
    console.log('Hour received: ', received);
    let timezone = (received - now.hour());
    if (timezone < -9) {
        timezone = timezone === -10? 14: 14 + (timezone+10);
        console.log('timezone:', timezone);
    } else {
        console.log('timezone:', timezone);
    }
    let parsedTimezone = (timezone < 0 ? '-': '+')+`${timezone.toString().replace('-', '').padStart(2, '0')}:00`;

    let timezonedTime = moment().utcOffset(parsedTimezone);
    timezonedTime.set({'hour': 9, 'minute': 0, 'second': 0});
    timezonedTime.add(received >= 2? 1 : 0, 'd');
    res.send({
        'timezone': parsedTimezone,
        'tomorrowMorning': timezonedTime.format()
    });
});

var server = app.listen(process.env.PORT || 3000, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
});

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
    await request(options, async function (error, response, body) {
        if (error) throw new Error(error);
        
        let videoResponse = JSON.parse(body);
        console.log('VideoNote sent successfully: ', videoResponse);
        if (videoResponse.ok && videoResponse.result ) {
            console.log('Video Note: ', videoResponse.result.video_note );
            let videoNote = videoResponse.result.video_note;
            await sendFinalMessage(chatId, videoNote);
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

async function getFileAndSaveIt(url) {
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
