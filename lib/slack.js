const needle = require("needle");
const ip = require("ip");

const config = require("../config");

const slack = (() => {
  var sendMessage = (message, callback) => {
    let webHookUri = config.slack.webHookUri;

    let options = {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    };

    let payload = {
      attachments: [
        {
          fallback: message.title,
          color: message.color,
          fields: [
            {
              title: ip.address(),
              value: message.value,
              short: false
            }
          ]
        }
      ]
    };

    needle.post(
      webHookUri,
      `payload=${JSON.stringify(payload)}`,
      options,
      callback
    );
  };
})();

if (exports) {
  module.exports = slack;
}
