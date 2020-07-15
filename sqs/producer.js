const aws = require("aws-sdk");
const os = require("os");
const interfaces = os.networkInterfaces();

const config = require("../config");
const logger = require("../lib/logger");

const producer = (() => {
  const engine = config.worker.engine;
  const engines = config.worker.engines;

  const mode = config.sqs.mode;
  const modes = config.sqs.modes;
  const region = config.sqs.region;
  const regions = config.sqs.regions;
  const accessKeyId = config.sqs.access_key_id;
  const secretAccessKey = config.sqs.secret_access_key;
  const baseUrls = config.sqs.base_query_urls;

  let sqsName = "";
  const queryUrl = baseUrls[regions.indexOf(region)];

  aws.config.update({
    region,
    accessKeyId,
    secretAccessKey
  });

  const Sqs = new aws.SQS();
  logger.debug(
    `[SQS/producer] Producer 시작 [mode: ${mode}, region: ${region}]`
  );

  const produce = (message, callback) => {
    let addresses = [];
    for (let idx in interfaces) {
      for (let idx2 in interfaces[idx]) {
        let address = interfaces[idx][idx2];
        if (address.family === "IPv4" && !address.internal) {
          addresses.push(address.address);
        }
      }
    }

    message.host = os.hostname();
    message.ip = addresses[0];

    let payload = {
      DelaySeconds: 0,
      MessageBody: "",
      queryUrl: ""
    };

    let sqsNames = config.sqs.progress.names;
    let sqsName = sqsNames[modes.indexOf(mode)];

    if (region === regions[0]) {
      sqsName = sqsName.replace(".fifo", "");
    } else if (region === regions[1]) {
      if (sqsName.indexOf(".fifo") > -1) {
        let groupCount = "";

        // 큐 설정 파싱 (FIFO 분산이라면)
        if (message.groupCount !== undefined && message.groupCount !== 0) {
          groupCount = (message.requestSeq % message.groupCount) + 1;
        }

        // 메시지 그룹 ID 계산
        // GroupCount는 마스터로부터 설정되어 넘어옴
        let MessageGroupId = "";
        if (sqsName.indexOf("Progress") > -1) {
          MessageGroupId = "progress" + groupCount;
        } else if (sqsName.indexOf("Request") > -1) {
          MessageGroupId = "request" + groupCount;
        }
        payload.MessageGroupId = MessageGroupId;
      }
    }

    // 쿼리 URL & 메시지 입력
    payload.QueueUrl = queryUrl + sqsName;
    payload.MessageBody = JSON.stringify(message);

    logger.debug(`[SQS/producer] 발송 메시지: ${JSON.stringify(payload)}`);
    Sqs.sendMessage(payload, function(err, results) {
      if (err) {
        callback(err);
      } else {
        logger.debug(`[SQS/producer] 발송 결과: ${JSON.stringify(result)}`);
        callback(null);
      }
    });
  };

  return {
    produce: produce
  };
})();

if (exports) {
  module.exports = producer;
}
