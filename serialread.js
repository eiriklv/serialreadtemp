var util = require('util');
var colors = require('colors');
var SerialPort = require("serialport");
var Serialport = require("serialport").SerialPort;

var handshakeInterval;

// new serial port instance
var serialPort = new Serialport("/dev/tty.usbmodem1421", {
    baudrate: 115200,
    parser: SerialPort.parsers.readline("\n") // terminate on newline
}, false, function(err){
    if(err){
        console.log('error on serial port init: '.red + err);
    }
    else{
        console.log('created serialport instance'.yellow);
    }
});

var handshake = false;

// open initial connection
openConnection(serialPort);

function openConnection(){
    // handle connection
    handleConnection();
    serialPort.open(function(err){
        if(err){
            console.log('error on opening serial connection: '.red + err);
        }
        else{
            console.log('serial connection successfully opened'.green);
        }
    });
}

function reconnect(){
    handshake = false;
    handleConnection(function(){
        serialPort.open(function(err){
            if(err){
                console.log('error on reconnecting serial connection: '.red + err);
            }
            else{
                console.log('serial recconnected successfully'.green);
                //doHandshake();
            }
        });
    });
}

function doHandshake(){
    handshakeInterval = setInterval(function(){
        serialPort.write(String.fromCharCode(10), function(err, results){
            if(err){
                console.log('error sending handshake request: '.red + err);
            }
            else{
                console.log('successfully sent handshake request'.yellow);
                console.log('results: ' + results);
            }
        });
    }, 100);
}

function handleConnection(callback){
    serialPort.on("open", function (){
        console.log('serial connection open'.grey);

        setTimeout(function(){
            serialPort.close(function(err){
                if(err){
                    console.log('error on closing connection: ' + err);
                }
                else{
                    
                }
            });
        }, 5000);

        // send handshake to arduino after 2 seconds
        doHandshake();

        // listen for data from serial port
        serialPort.on('data', function (data){
            // if handshaken, process data
            if(handshake){
                try{
                    var parsed = JSON.parse(data);
                    console.log('data received: '.blue + util.inspect(parsed, { colors: true }));
                    //console.log(util.inspect(parsed, { colors: true }));
                }
                catch(e){
                    console.log('error on parsing data: '.red + e);
                }
            }
            else{
                console.log('not ready'.yellow);
            }

            //check that we are starting on a new line
            if(parseInt(data, 10) == 1234567890){
                console.log('got handshake confirmation'.green);
                handshake = true;
                clearInterval(handshakeInterval);
            }
        });

        serialPort.on('error', function (err){
            console.log('serial connection error: '.red + err);
        });

        serialPort.on("close", function (data){
            console.log('connection closed: '.yellow + data);
            // reset connection
            // open a new connection in 2 seconds
            setTimeout(function(){
                reconnect();
            }, 2000);
        });
    });
    if(callback){
        callback();
    }
}