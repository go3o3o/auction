const logger = require("./lib/logger");

const loader = (() => {
  try {
    const load = (collectParams, callback) => {
      const engine = require(`./${collectParams.engine.filePath}`);
      logger.debug(`[loader] execute engine`);
      logger.debug(` ### engine path: ${collectParams.engine.filePath}`);

      engine.execute(collectParams, (err, md5) => {
        if (err) {
          callback(err);
        } else {
          if (
            md5 === "NO_RESULTS" ||
            md5 === "SUCCESSFULLY_COLLECTED" ||
            md5 === "NO_MORE_LIST_PAGE"
          ) {
            md5 = "";
          }

          callback(null, md5);
        }
      });
    };

    return {
      load: load
    };
  } catch (error) {
    logger.error(error);
  }
})();

if (exports) {
  module.exports = loader;
}
