var amqp = require("amqplib/callback_api");
var channel;

amqp.connect("amqp://localhost", function (error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function (error1, channel1) {
    if (error1) {
      throw error1;
    }
    channel = channel1;
    var queue = "task_queue";
    var msg = process.argv.slice(2).join(" ") || "Hello World!";

    channel.assertQueue(queue, {
      durable: true,
    });
    channel.sendToQueue(queue, Buffer.from(msg), {
      persistent: true,
    });
  });
  setTimeout(function () {
    connection.close();
    process.exit(0);
  }, 500);
});

const sendDataToQueue = (queueName, data) => {};
