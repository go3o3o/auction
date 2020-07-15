const path = require("path");
const async = require("async");
const moment = require("moment");
const spawn = require("child_process").spawn;

const config = require("./config");
const logger = require("./lib/logger");
const fsUtil = require("./lib/fsUtil");
const loader = require("./loader");

moment().utcOffset("+09:00");

const collector = (() => {})();
