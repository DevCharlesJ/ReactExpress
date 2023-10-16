const express = require('express');
const app = express();
const React = require('react');
const nunjucks = require('nunjucks');
const bodyParser = require('body-parser');
const { EventEmitter } = require('events');

const chatEvents = new EventEmitter();

app.use(express.json());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
// app.use(bodyParser.urlencoded({ extended: true }));


// Configure nunjucks, later
// nunjucks.configure('views', {autoescape: true, express: app});
// app.set('view engine', 'njk')

// Set static directory
app.use(express.static('public'));

const chatEventSignatures = new Map(); // table of requests to chat event source

chatEvents.on('new_message', (message) => {
    const eventData = {
        event: 'new_message',
        data: {
            content: message
        }
    }

    for(let [info, res] of chatEventSignatures){
        res.write(`event: ${eventData.event}\n`);
        res.write(`data: ${JSON.stringify(eventData.data)}\n\n`);
    };
    
})

app.post('/chat/submit', (req, res) => {
    
    const msg = req.body['message'];
    if(msg && typeof msg == 'string'){
        const address = req.socket.remoteAddress || req.socket.localAddress;
        const port = req.socket.remotePort || req.socket.localPort;

        chatEvents.emit('new_message', {
            author: `${address}:${port}`,
            text: msg
        });
    }

    res.end()
});


app.get('/chat/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const address = req.socket.remoteAddress || req.socket.localAddress;
    const port = req.socket.remotePort || req.socket.localPort;

    chatEventSignatures.set([address, port], res);


    const heartbeat = setInterval(() => { 
        // const eventData = {
        //     event: 'new_messages',
        //     data: {'messages': getMessages()}
        // }

        const eventData = {
            event: 'heartbeat',
            data: 'none'
        }

        res.write(`event: ${eventData.event}\n`);
        res.write(`data: ${JSON.stringify(eventData.data)}\n\n`);
    }, 1000)

    req.on('close', () => {
        clearInterval(heartbeat);
        chatEventSignatures.delete(req.ip);
    });
})


app.listen(3001, 'localhost', () => {
    console.log(`Server is up: http://localhost:3001`)
})