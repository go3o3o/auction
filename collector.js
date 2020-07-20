const path = require("path");
const async = require("async");
const moment = require("moment");
const spawn = require("child_process").spawn;

const config = require("./config");
const logger = require("./lib/logger");
const fsUtil = require("./lib/fsUtil");
const loader = require("./loader");

moment().utcOffset("+09:00");

const collector = (() => {
  const SQSProducer = require("./sqs/producer");

  const engine = config.worker.engine;

  const collectBucket = config.s3.bucket;
  const collectPath = config.s3.collect_path;

  const __checkFile = (filePath, s3FilePath, callback) => {
    fsUtil.getStats(filePath, function(err, exist, stats) {
      if (err) {
        callback(err);
      } else {
        if (exist) {
          if (stats.isFile()) {
            callback(null);
          }
        } else {
          fsUtil.downloadFile(collectBucket, s3FilePath, callback);
        }
      }
    });
  };

  const __getMetainfo = (message, callback) => {
    let results = {};

    results.requestSeq = message.requestSeq;
    results.customer = message.customer;
    results.source = message.channel.name;
    results.requestUrl = message.channel.url;
    results.period = message.period;
    results.md5 = message.md5;

    if (message.period === "DD") {
      results.startDt = message.startDt;
      results.endDt = message.endDt;
    } else if (message.period === "MM") {
      results.startDt = moment(message.startDt, "YYYY-MM").format("YYYY-MM-DD");
      results.endDt = moment(message.endDt, "YYYY-MM")
        .add(1, "M")
        .date(0)
        .format("YYYY-MM-DD");
    } else if (message.period === "YY") {
      results.startDt = moment(message.startDt, "YYYY").format("YYYY-MM-DD");
      results.endDt = moment(message.endDt, "YYYY")
        .add(1, "y")
        .date(0)
        .format("YYYY-MM-DD");
    } else if (message.period === "QQ") {
      results.startDt = moment(message.startDt, "YYYY-Q").format("YYYY-MM-DD");
      results.endDt = moment(message.endDt, "YYYY-Q")
        .add(1, "Q")
        .date(0)
        .format("YYYY-MM-DD");
    }

    results.startDt = moment().format("YYYY-MM-DD");

    if (message.keyword !== undefined) {
      results.keyword = message.keyword;
    }

    if (message.channel.loginRule !== undefined) {
      results.id = message.channel.loginRule.id;
      results.password = message.channel.loginRule.password;
    }

    callback(null, results);
  };

  const __findRule = (url, rules, callback) => {
    let results = {};
    let findFlag = false;
    let rulecount = 0;

    async.whilst(
      function() {
        return ruleCount <= rules.length && findFlag === false;
      },
      function(callback) {
        let checkCount = 0;
        const urlPatterns = rules[ruleCount].urlPattern;
        async.eachSeries(
          urlPatterns,
          function(urlPattern, callback) {
            const urlRegexResult = new RegExp(urlPattern).exec(url);
            if (!findFlag && urlRegexResult !== null) {
              results = rules[ruleCount];
              findFlag = true;
              ruleCount = rules.length;
              callback(null);
            } else {
              if (checkCount < urlPatterns.length - 1) {
                checkCount++;
              } else {
                ruleCount++;
              }
              callback(null);
            }
          },
          callback
        );
      },
      function(err) {
        if (err) {
          callback(err);
        } else {
          if (findFlag) {
            callback(null, results);
          } else {
            callback("ERR_NOT_FOUND_RULES");
          }
        }
      }
    );
  };

  const collect = (message, callback) => {
    message = JSON.parse(message);

    let collectParams = {};

    async.waterfall(
      [
        function(callback) {
          logger.debug(`[collector] Step #1. 수집 요청 메타 파라미터 생성`);
          __getMetainfo(message, (err, result) => {
            if (err) {
              callback(err);
            } else {
              collectParams = result;
              callback(null);
            }
          });
        },
        function(callback) {
          logger.debug(`[collector] Step #2. 수집 진행 메시지 처리`);
          if (message.role === "linkCollector") {
            message.status = "linkCollecting";
          } else if (message.role === "docCollector") {
            message.status = "docCollecting";
          } else if (message.role === "linkDocCollector") {
            message.status = "linkDocCollecting";
          } else if (message.role === "apiCollector") {
            message.status = "apiCollecting";
          }

          callback(null);
        },
        function(callback) {
          logger.debug(`[collector] Step #3. 수집 엔진 파일 확인 및 다운로드`);

          let filePath = "";
          let fileName = "";

          if (message.role === "linkCollector") {
            filePath = message.channel.linkEngine.filePath;
            fileName = message.channel.linkEngine.fileName;
          } else if (message.role === "docCollector") {
            filePath = message.channel.docEngine.filePath;
            fileName = message.channel.docEngine.fileName;
          } else if (message.role === "linkDocCollector") {
            filePath = message.channel.linkDocEngine.filePath;
            fileName = message.channel.linkDocEngine.fileName;
          } else if (message.role === "apiCollector") {
            filePath = message.channel.apiEngine.filePath;
            fileName = message.channel.apiEngine.fileName;
          }

          collectParams.engine = {};
          collectParams.engine.filePath = filePath;
          collectParams.engine.fileName = fileName;

          __checkFile(
            __dirname + path.sep + filePath,
            filePath,
            fileName,
            callback
          );
        },
        function(callback) {
          logger.debug(
            `[collector] Step #4. injectScript 파일 확인 및 다운로드`
          );
          collectParams.injectScripts = [];

          async.eachSeries(
            message.channel.injectScripts,
            function(script, callback) {
              const filePath = script.filePath;
              const fileName = script.fileName;

              collectParams.injectScripts.push(`./${filePath}`);
              __checkFile(
                __dirname + path.sep + filePath,
                filePath,
                fileName,
                callback
              );
            },
            callback
          );
        },
        function(callback) {
          logger.debug(`[collector] Step #5. 룰 파일 처리 및 수집룰 가져오기`);
          const filePath = message.channel.rule.filePath;
          const fileName = message.channel.rule.fileName;

          async.waterfall(
            [
              function(callback) {
                logger.debug(`[collector] Step #5-1. 룰 파일 확인 및 다운로드`);
                __checkFile(
                  __dirname + path.sep + filePath,
                  filePath,
                  fileName,
                  callback
                );
              },
              function(callback) {
                logger.debug(`[collector] Step #5-2. 룰 파일 파싱`);
                fsUtil.readFile(
                  __dirname + path.sep + filePath,
                  (err, data) => {
                    if (err) {
                      callback(err);
                    } else {
                      callback(null, JSON.parse(data));
                    }
                  }
                );
              },
              function(rule, callback) {
                logger.debug(`[collector] Step #5-3. 수집처에 맞는 룰 찾기`);
                const url = message.channel.url;

                __findRule(url, rule, (err, result) => {
                  if (err) {
                    callback(err);
                  } else {
                    collectParams.rule = result;

                    if (collectParams.rule.linkSelectors) {
                      collectParams.rule.linkSelectors.url = url;
                    }

                    callback(null);
                  }
                });
              }
            ],
            callback
          );
        },
        function(callback) {
          logger.debug(`[collector] Step #6. 수집 결과 저장 디렉토리 생성`);
          let collectDataPath =
            __dirname +
            path.sep +
            collectPath +
            path.sep +
            message.customer +
            path.sep +
            message.requestSeq +
            path.sep +
            message.role +
            path.sep +
            collectParams.statDt.replace(/-/g, "");
          let collectDataS3Path =
            collectPath +
            "/" +
            message.customer +
            "/" +
            message.requestSeq +
            "/" +
            message.role +
            "/" +
            collectParams.statDt.replace(/-/g, "");
          let collectAttachDataS3Path =
            collectPath +
            "/" +
            message.customer +
            "/" +
            message.requestSeq +
            "/attachCollector/" +
            collectParams.statDt.replace(/-/g, "");

          fsUtil.makeDir(collectDataPath, function(err) {
            if (err) {
              callback(err);
            } else {
              collectParams.collectDataPath = collectDataPath;
              collectParams.collectDataS3Path = collectDataS3Path;
              collectParams.collectAttachDataS3Path = collectAttachDataS3Path;
              callback(null);
            }
          });
        },
        function(callback) {
          logger.debug(
            `[collector] Step #7. 수집 시 사용할 UserAgent 랜덤 선택`
          );
          const min = 0;
          const max = message.userAgents.length;
          const random = Math.floor(Math.random() * (max - min)) + min;

          collectParams.userAgent = message.userAgents[random].useragent;
          callback(null);
        },
        function(callback) {
          logger.debug(`[collector] Step #8. chrome 엔진 수집 처리`);
          logger.info(collectParams);

          if (message.role === "docCollector") {
            collectParams.doc = message.doc;
          }

          loader.load(collectParams, (err, md5) => {
            if (err) {
              if (message.role === "linkCollector") {
                message.status = "linkCollectError";
              } else if (message.role === "docCollector") {
                message.status = "docCollectError";
              } else if (message.role === "linkDocCollector") {
                message.status = "linkDocCollectError";
              } else if (message.role === "apiCollector") {
                message.status = "apiCollectError";
              }
              message.errorMsg = err.toString();

              // SQS 메시지 발송
              SQSProducer.produce(message, err2 => {
                if (err2) {
                  callback(err2);
                } else {
                  callback(err);
                }
              });
            } else {
              callback(null, md5);
            }
          });
        },
        function(md5, callback) {
          logger.debug(`[collector] Step #8-2. MD5 처리`);
          logger.debug(` ### MD5 ${md5}`);

          if (md5 === undefined) {
            // 마스터 쪽에서 md5 = undefined 인 경우 상태 업데이트 없이 다음 스텝으로 진행
            callback(null);
          } else if (md5 === null || md5 === "") {
            // 빈칸이거나 null 이면 상태 업데이트 하면 안됨
            md5 = undefined;
            message.md5 = md5;
            callback(null);
          } else {
            message.md5 = md5;
            callback(null);
          }
        },
        function(callback) {
          logger.debug(`[collector] Step #9. 수집 결과 파일 가져오기`);
          logger.debug(collectParams.collectDataPath);
          fsUtil.readDir(collectParams.collectDataPath, function(err, files) {
            if (err) {
              callback(err);
            } else {
              if (files.length > 0) {
                let json_file = [];

                async.eachSeries(
                  files,
                  function(file, callback) {
                    if (file.substring(file.length - 4) === "json") {
                      json_files.push(file);
                    }
                    callback(null);
                  },
                  function(err) {
                    if (err) {
                      callback(err);
                    } else {
                      callback(null, json_files);
                    }
                  }
                );
              } else {
                callback("NO_RESULTS");
              }
            }
          });
        },
        function(files, callback) {
          logger.debug(`[collector] Step #10. 수집 결과 파일 처리`);

          if (files.length > 0) {
            async.eachSeries(
              files,
              function(file, callback) {
                async.waterfall(
                  [
                    function(callback) {
                      logger.debug(
                        `[collector] Step #10-1. 수집 결과 파일 파싱`
                      );
                      fsUtil.readFile(
                        collectParams.collectDataPath + path.sep + file,
                        function(err, data) {
                          if (err) {
                            callback(err);
                          } else {
                            callback(null, JSON.parse(data));
                          }
                        }
                      );
                    },
                    function(results, callback) {
                      if (message.role === "linkCollector") {
                        logger.debug(
                          `[collector] Step #10-2. linkCollector 결과 처리`
                        );

                        async.waterfall(
                          [
                            function(callback) {
                              logger.debug(`Step #10-2-1. 수집 데이터 업로드`);
                              logger.debug(
                                ` ### upload File: ${collectParams.collectDataPath}/${file}`
                              );
                              logger.debug(
                                ` ### upload Path: ${collectParams.collectDataS3Path}`
                              );

                              fsUtil.uploadFile(
                                collectParams.collectDataPath + path.sep + file,
                                collectBucket,
                                collectParams.collectAttachDataS3Path,
                                function(err, result) {
                                  if (err) {
                                    callback(err);
                                  } else {
                                    fsUtil.removeFile(
                                      collectParams.collectDataPath +
                                        path.sep +
                                        file,
                                      callback
                                    );
                                  }
                                }
                              );
                            },
                            function(callback) {
                              logger.debug(`Step #10-2-2. 수집 상태 완료 처리`);
                              message.status = "linkFinished";

                              SQSProducer.produce(message, callback);
                            },
                            function(callback) {
                              logger.debug(`Step #10-2-3. 문서 수집 요청`);
                              async.eachSeries(
                                results,
                                function(result, callback) {
                                  message.role = "docCollector";
                                  message.status = "docRequest";
                                  message.doc = result;

                                  SQSProducer.produce(message, callback);
                                },
                                function(err) {
                                  if (err) {
                                    callback(err);
                                  } else {
                                    message.role = "linkCollector";
                                    message.status = "linkCollecting";
                                    callback(null);
                                  }
                                }
                              );
                            }
                          ],
                          callback
                        );
                      } else if (message.role === "docCollector") {
                        logger.debug(
                          `[collector] Step #10-2. docCollector 결과 처리`
                        );

                        async.waterfall(
                          [
                            function(callback) {
                              logger.debug("Step #10-2-1. 수집 데이터 업로드");
                              logger.debug(
                                ` ### upload File: ${collectParams.collectDataPath}/${file}`
                              );
                              logger.debug(
                                ` ### upload Path: ${collectParams.collectDataS3Path}`
                              );

                              fsUtil.uploadFile(
                                collectParams.collectDataPath + path.sep + file,
                                collectBucket,
                                collectParams.collectDataS3Path,
                                function(err, result) {
                                  if (err) {
                                    callback(err);
                                  } else {
                                    fsUtil.removeFile(
                                      collectParams.collectDataPath +
                                        path.sep +
                                        file,
                                      callback
                                    );
                                  }
                                }
                              );
                            },
                            function(callback) {
                              logger.debug(
                                `Step #10-2-2. 첨부파일 업로드 처리`
                              );

                              async.eachSeries(
                                results.attachs,
                                function(attach, callback) {
                                  logger.debug(
                                    ` ### upload File: ${collectParams.collectDataPath}/${attach.real_file_name}`
                                  );
                                  logger.debug(
                                    ` ### upload Path: ${collectParams.collectAttachDataS3Path}`
                                  );

                                  fsUtil.uploadFile(
                                    collectParams.collectDataPath +
                                      path.sep +
                                      attach.real_file_name,
                                    collectBucket,
                                    collectParams.collectAttachDataS3Path,
                                    function(err, result) {
                                      if (err) {
                                        if (
                                          err ===
                                          "ERR_NO_SUCH_FILE_OR_DIRECTORY"
                                        ) {
                                          logger.warn(err);
                                          callback(null);
                                        } else {
                                          callback(err);
                                        }
                                      } else {
                                        fsUtil.removeFile(
                                          collectParams.collectDataPath +
                                            path.sep +
                                            attach.real_file_name,
                                          callback
                                        );
                                      }
                                    }
                                  );
                                },
                                callback
                              );
                            },

                            function(callback) {
                              logger.debug(`Step #10-2-3. 수집 상태 완료 처리`);
                              message.status = "docFinished";

                              SQSProducer.produce(message, callback);
                            }
                          ],
                          callback
                        ); // waterfall
                      } else if (message.role === "linkDocCollector") {
                        logger.debug(
                          `[collector] Step #10-2. linkDocCollector 결과 처리`
                        );

                        async.waterfall(
                          [
                            function(callback) {
                              logger.debug("Step #10-2-1. 수집 데이터 업로드");
                              logger.debug(
                                ` ### upload File: ${collectParams.collectDataPath}/${file}`
                              );
                              logger.debug(
                                ` ### upload Path: ${collectParams.collectDataS3Path}`
                              );

                              fsUtil.uploadFile(
                                collectParams.collectDataPath + path.sep + file,
                                collectBucket,
                                collectParams.collectDataS3Path,
                                function(err, result) {
                                  if (err) {
                                    callback(err);
                                  } else {
                                    fsUtil.removeFile(
                                      collectParams.collectDataPath +
                                        path.sep +
                                        file,
                                      callback
                                    );
                                  }
                                }
                              );
                            },
                            function(callback) {
                              logger.debug(
                                `Step #10-2-2. 첨부파일 업로드 처리`
                              );

                              async.eachSeries(
                                results,
                                function(dialog, callback) {
                                  if (dialog === null || dialog === undefined) {
                                    callback(null);
                                  } else {
                                    async.eachSeries(
                                      dialog.attachs,
                                      function(attach, callback) {
                                        logger.debug(
                                          ` ### upload File: ${collectParams.collectDataPath}/${attach.real_file_name}`
                                        );
                                        logger.debug(
                                          ` ### upload File: ${collectParams.collectAttachDataS3Path}`
                                        );

                                        fsUtil.uploadFile(
                                          collectParams.collectDataPath +
                                            path.sep +
                                            attach.real_file_name,
                                          collectBucket,
                                          collectParams.collectAttachDataS3Path,
                                          function(err, results) {
                                            if (err) {
                                              if (
                                                err ===
                                                "ERR_NO_SUCH_FILE_OR_DIRECTORY"
                                              ) {
                                                logger.warn(err);
                                                callback(null);
                                              } else {
                                                callback(err);
                                              }
                                            } else {
                                              fsUtil.removeFile(
                                                collectParams.collectDataPath +
                                                  path.sep +
                                                  attach.real_file_name,
                                                callback
                                              );
                                            }
                                          }
                                        );
                                      },
                                      callback
                                    );
                                  }
                                },
                                callback
                              );
                            },

                            function(callback) {
                              logger.debug(`Step #10-2-3. 수집 상태 완료 처리`);
                              message.status = "docFinished";

                              SQSProducer.produce(message, callback);
                            }
                          ],
                          callback
                        );
                      } else if (message.role === "apiCollector") {
                        logger.debug(
                          `[collector] Step #10-2. apiCollector 결과 처리`
                        );

                        async.waterfall(
                          [
                            function(callback) {
                              logger.debug(`Step #10-2-1. 수집 데이터 업로드`);
                              logger.debug(
                                ` ### upload File: ${collectParams.collectDataPath}/${file}`
                              );
                              logger.debug(
                                ` ### upload Path: ${collectParams.collectDataS3Path}`
                              );

                              fsUtil.uploadFile(
                                collectParams.collectDataPath + path.sep + file,
                                collectBucket,
                                collectParams.collectDataS3Path,
                                function(err, result) {
                                  if (err) {
                                    callback(err);
                                  } else {
                                    fsUtil.removeFile(
                                      collectParams.collectDataPath +
                                        path.sep +
                                        file,
                                      callback
                                    );
                                  }
                                }
                              );
                            },
                            function(callback) {
                              logger.debug(
                                `Step #10-2-2. 첨부파일 업로드 처리`
                              );
                              async.eachSeries(
                                results,
                                function(dialog, callback) {
                                  async.eachSeries(
                                    dialog.attachs,
                                    function(attach, callback) {
                                      logger.debug(
                                        ` ### upload File: ${collectParams.collectDataPath}/${attach.real_file_name}`
                                      );
                                      logger.debug(
                                        ` ### upload Path: ${collectParams.collectAttachDataS3Path}`
                                      );

                                      fsUtil.uploadFile(
                                        collectParams.collectDataPath +
                                          path.sep +
                                          attach.real_file_name,
                                        collectBucket,
                                        collectParams.collectAttachDataS3Path,
                                        function(err, result) {
                                          if (err) {
                                            if (
                                              err ===
                                              "ERR_NO_SUCH_FILE_OR_DIRECTORY"
                                            ) {
                                              logger.warn(err);
                                              callback(null);
                                            } else {
                                              callback(err);
                                            }
                                          } else {
                                            fsUtil.removeFile(
                                              collectParams.collectDataPath +
                                                path.sep +
                                                attach.real_file_name,
                                              callback
                                            ); // removeFile
                                          }
                                        }
                                      );
                                    },
                                    callback
                                  );
                                },
                                callback
                              );
                            },
                            function(callback) {
                              logger.debug(`Step #10-2-3. 수집 상태 완료 처리`);
                              message.status = "apiFinished";

                              SQSProducer.produce(message, callback);
                            }
                          ],
                          callback
                        );
                      }
                    }
                  ],
                  callback
                );
              },
              callback
            );
          } else {
            callback("NO_RESULTS");
          }
        }
      ],
      function(err) {
        if (err) {
          logger.debug(`[collector] Step #10. 수집 에러 처리`);

          if (err === "NO_RESULTS") {
            var errors = [
              "ERR_NOT_FOUND_RULES",
              "LIST_PARSING_RULE_IS_NOT_MATCH",
              "DOCUMENT_PARSING_RULE_IS_NOT_MATCH",
              "PAGINATION_PARSING_RULE_IS_NOT_MATCH",
              "ATTACH_PARSING_RULE_IS_NOT_MATCH"
            ];

            logger.warn(err.toString());

            if (new RegExp(errors.join("|")).test(message.errorMsg)) {
              if (message.role === "linkCollector") {
                message.status = "linkCollectError";
              } else if (message.role === "docCollector") {
                message.status = "docCollectError";
              } else if (message.role === "linkDocCollector") {
                message.status = "linkDocCollectError";
              } else if (message.role === "apiCollector") {
                message.status = "apiCollectError";
              }
            } else {
              if (message.role === "linkCollector") {
                message.role = "docCollector";
                message.status = "docFinished";
              } else if (message.role === "docCollector") {
                message.status = "docFinished";
              } else if (message.role === "linkDocCollector") {
                message.status = "linkDocFinished";
              } else if (message.role === "apiCollector") {
                message.status = "apiFinished";
              }
            }

            SQSProducer.produce(message, callback);
          } else {
            /*
            ERR_NOT_FOUND_RULES: 수집 룰을 찾지 못함
            ERR_NOT_RECEIVED_CASPER_RESULT: 캐스퍼 실행 오류
  
            LIST_PARSING_RULE_IS_NOT_MATCH: 리스트 파싱 중 에러 발생
            PAGINATION_PARSING_RULE_IS_NOT_MATCH: 페이징 중 에러 발생
            ATTACH_PARSING_RULE_IS_NOT_MATCH: 첨부파일 파싱 중 에러 발생
            DOCUMENT_PARSING_RULE_IS_NOT_MATCH: 원문 파싱 중 에러 발생
            */
            logger.error(err.toString());
            message.errorMsg = err.toString();

            if (message.role === "linkCollector") {
              message.status = "linkCollectError";
            } else if (message.role === "docCollector") {
              message.status = "docCollectError";
            } else if (message.role === "linkDocCollector") {
              message.status = "linkDocCollectError";
            } else if (message.role === "apiCollector") {
              message.status = "apiCollectError";
            }

            SQSProducer.produce(message, callback);
          }
        } else {
          logger.debug(`[collector] Step #10. 수집 완료`);
          callback(null, message);
        }
      }
    );
  };

  return {
    collect: collect
  };
})();

if (exports) {
  module.exports = collector;
}
