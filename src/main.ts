import { Logger } from "@nestjs/common";
import console from "console";
import { clearInterval } from "timers";

var mqtt = require('mqtt');

var mqtt_url = 'mqtt://roedeer.rmq.cloudamqp.com';

var options = {
  port: '1883',
  username: 'qslokubg:qslokubg',
  password: 'CO-VVN9Snm4uxGQe-Jq2rsv_t5taPC5n',
};

var interval: any;

const logger = new Logger('Main');

var client = mqtt.connect(mqtt_url, options);

client.on('connect', function () {

  logger.log("CloudAMQP ile bağlantı sağlandı\n");

  client.subscribe('SCOS', { qos: 0 });
  client.subscribe('SCOR', { qos: 0 });

  let i = 1;
  interval = setInterval(() => {
    var message = `*SCOR,OM,123456789123456,Q0,412,${getRndBatteryLevel()},28#`;
    client.publish('SCOR', message, function () {
      logger.log(`Device has sent       : ${message}`);
      i++;
    });
  }, 5000);

});

client.on('error', (err) => {
  logger.log(`Bir hata oluştu. ${err}`);
  client.end();
});

client.on('close', () => {
  logger.log('CloudAMQP ile bağlantı kesildi');
});

client.on('message', function (topic, message, packet) {
  // logger.log("Received '" + message + "' on '" + topic + "'");
  // logger.log(JSON.stringify(packet));
  if (!message.toString().startsWith('*') || !message.toString().endsWith('#'))
    console.log('Unexpected string standart');
  else {
    let dataObj = parseDeviceData(message);

    if (dataObj.DATA_RESOURCE === 'SCOR') {

      var receiverMessage = `Imei: ${dataObj.IMEI} Voltage ${dataObj.VOLTAGE} Battery Level ${dataObj.BATTERY_LEVEL}% Network Signal ${dataObj.NETWORK_SIGNAL}%`;
      logger.log(`Server has received   : ${receiverMessage} \n`);

      if (dataObj.BATTERY_LEVEL < 40) {
        var sender_message = `*SCOS,OM,123456789123456,R0#`;
        client.publish('SCOS', sender_message, function () {
          logger.log(`Server has sent       : ${sender_message}`);
        });
      }

    } else if (dataObj.DATA_RESOURCE === 'SCOS') {

      var receiverMessage = `Imei: ${dataObj.IMEI} Instruction ${dataObj.INSTRUCTION}`;
      logger.log(`Device has received   : ${receiverMessage} \n`);

      if (dataObj.INSTRUCTION === 'R0') {
        logger.log(`Device closing ...`);
        clearInterval(interval);
        setTimeout(() => {
          logger.log(`Device is closed.`);
        }, 10000);
      }
    }
  }
});

function getRndBatteryLevel() {
  return Math.floor(Math.random() * 101);
}

function parseDeviceData(data) {
  let telegram = data.toString().substring(1, data.toString().length - 1);
  var strArray = telegram.split(',');

  return {
    DATA_RESOURCE: strArray[0],
    VENDOR_CODE: strArray[1],
    IMEI: strArray[2],
    INSTRUCTION: strArray[3],
    VOLTAGE: Number(strArray[4]) / 100,
    BATTERY_LEVEL: strArray[5],
    NETWORK_SIGNAL: networkSignalPercentage(1, 35, Number(strArray[6]))
  }
}

function networkSignalPercentage(min, max, value) {
  return (((value - min) * 100) / (max - min)).toFixed(1);
};