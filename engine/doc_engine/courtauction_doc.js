const puppeteer = require("puppeteer");
const moment = require("moment");
const fs = require("fs-extra");
const iconv = require("iconv-lite");

const logger = require("logger");

const getFiles = function(path, files) {
  fs.readdirSync(path).forEach(function(file) {
    var subpath = path + "/" + file;
    if (fs.lstatSync(subpath).isDirectory()) {
      getFiles(subpath, files);
    } else {
      if (file !== ".DS_Store") {
        files.push(path + "/" + file);
      }
    }
  });
};

//EUC-KR 인코딩.
var strUtf8Query = decodeURIComponent(keyword);
var buf = iconv.encode(strUtf8Query, "euc-kr");
var encodeStr = "";
for (var i = 0; i < buf.length; i++) {
  encodeStr += "%" + buf[i].toString("16");
}
encodeStr = encodeStr.toUpperCase();

const engine = (function() {
  const execute = function(params, callback) {
    // const requestUrl = params.requestUrl;
    const collectDataPath = params.collectDataPath;
    const userAgent = params.userAgent;

    const customer = params.customer;
    const source = params.source;

    const injectScripts = params.injectScripts;
    const docSelectors = params.rule.docSelectors;

    const linkCollectorPath = collectDataPath + customer + "/";
    let linkCollectors = [];
    logger.info("### linkCollector Path :: " + linkCollectorPath);
    getFiles(linkCollectorPath, linkCollectors);

    var content = "";

    const now = moment();

    // 브라우저 런치
    puppeteer
      .launch({
        headless: true
      })
      .then(async browser => {
        const page = await browser.newPage();

        // 유저에이전트
        await page.setUserAgent(userAgent);

        // Request 인터셉트
        await page.setRequestInterception(true);
        page.on("request", interceptedRequest => {
          // 불필요한 리소스 제외
          if (interceptedRequest._url.endsWith(".jpg")) {
            interceptedRequest.abort();
          } else {
            interceptedRequest.continue();
          }
        });

        // 뷰 포트 설정
        await page.setViewport({
          width: 1280,
          height: 960
        });

        let links = [];
        for (linkCollector of linkCollectors) {
          let jsons = fs.readJSONSync(linkCollector);
          for (json of jsons) {
            links.push(json.link);
          }
        }

        try {
          // 수집된 링크 만큼 for문 돌기
          for (link of links) {
            // 수집 URL 접근
            logger.debug("[chrome] Step #1. URL 접근");
            logger.debug("[chrome] url : " + link);
            await page.goto(link);

            // 인젝트 스크립트 설정 (주의! 인젝트 스크립트는 URL 접근 후 세팅 되어야함)
            for (let idx = 0; idx < injectScripts.length; idx++) {
              await page.addScriptTag({
                path: injectScripts[idx]
              });
              logger.debug(
                "[chrome] Step #2. 인젝트 스크립트 로딩 " + injectScripts[idx]
              );
            }

            // 문서 추출
            logger.debug("[chrome] Step #3. 문서 파싱");
            var result = await page.evaluate(function(selectors) {
              return __parseDocument(selectors);
            }, docSelectors);

            if (result === null) {
              await browser.close();
              throw Error("DOCUMENT_PARSING_RULE_IS_NOT_MATCH");
            } else if (Object.keys(result).length === 0) {
              await browser.close();
              throw Error("DOCUMENT_PARSING_RULE_IS_NOT_MATCH");
            } else {
              content = result.doc_content + "#" + keyword;
              var doc_datetime = moment(new Date(result.doc_datetime)).format(
                "YYYY-MM-DD-HHmmss"
              );

              result.doc_title = source;
              result.doc_content = parser(content);
              result.doc_url = link;
              result.img_url = [];

              result.view_count = 0;
              result.dislike_count = 0;
              result.share_count = 0;
              result.locations = "";
              result.source = source;
              result.search_keyword_text = keyword;
              result.customer_id = customer;
              // result.request_seq = requestSeq;
              result.pub_year = doc_datetime.split("-")[0];
              result.pub_month = doc_datetime.split("-")[1];
              result.pub_day = doc_datetime.split("-")[2];
              result.pub_time = doc_datetime.split("-")[3];
              result.doc_datetime = undefined;

              result.uuid = md5Generator(
                link,
                result.pub_year,
                result.pub_month,
                result.pub_day
              );

              result.depth1_seq = 3;
              result.depth2_seq = 17;
              result.depth3_seq = 0;
              result.depth1_nm = "SNS";
              result.depth2_nm = "인스타그램";
              result.depth3_nm = null;
              result.doc_second_url = "NULL";

              result.comments = [];

              logger.debug("[chrome] Step #4. 댓글 파싱 ");
              let comments = await page.evaluate(function(selector) {
                return __parseComment(selector);
              }, commentSelectors);

              // logger.info(comments);

              if (comments === null) {
                await browser.close();
                throw Error("COMMENT_PARSING_RULE_IS_NOT_MATCH");
              } else {
                comments.forEach(function(comment) {
                  comment.cmt_datetime = moment(
                    new Date(comment.cmt_datetime)
                  ).format("YYYY-MM-DD-HHmmss");
                });
                result.comments = result.comments.concat(comments);
              }
              result.comment_count = comments.length;

              // 저장
              const fileName =
                "D-1-" + now.format("YYYYMMDDHHmm-ssSSS") + ".json";
              logger.debug(
                "[chrome] Step #5. 저장 " +
                  collectDataPath +
                  path.sep +
                  fileName
              );
              await fs.writeFile(
                collectDataPath + path.sep + fileName,
                JSON.stringify(result),
                err => {
                  if (err) throw err;
                }
              );
            }
          }

          // 브라우저 닫기
          logger.debug("[chrome] Step #6. 수집 종료");
          await browser.close();
          callback(null);
        } catch (error) {
          await browser.close();
          throw error;
        }
      })
      .catch(err => {
        if (err) {
          if (
            err.message === "NO_RESULTS" ||
            err.message === "SUCCESSFULLY_COLLECTED" ||
            err.message === "NO_MORE_LIST_PAGE"
          ) {
            callback(null, err.message);
          } else {
            callback(err);
          }
        } else {
          callback(null);
        }
      });
  };

  return {
    execute: execute
  };
})();

engine.execute(
  {
    requestUrl:
      "https://www.courtauction.go.kr/RetrieveRealEstMulDetailList.laf?",
    customer: "courtauction",
    collectDataPath:
      "/Users/yoni/d-platform/30.DMap/00.workspace/auction/collect_data/linkCollector/",
    userAgent:
      "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)",
    requestSeq: 0,
    source: "법원경매정보",
    injectScripts: [
      "../inject_script/documentParser.js",
      "../inject_script/datetimeParser.js",
      "../inject_script/commentParser.js"
    ],
    rule: {
      docSelectors: {
        documentSelector: "main[class] article[class]",
        documentNoResultSelector: "div.error-container",
        contentSelector: "div:nth-child(3) > div > ul > div[role] span",
        writerSelector: "div:nth-child(2) > div[class] > div:first-child a",
        datetimeSelector: "time[datetime]",
        datetimeAttr: "datetime",
        likeCountSelector: "div section:nth-child(2) button span",
        InstaCommentCountSelector: "div > div > ul li > div > div"
      }
    }
  },
  err => {
    if (err) {
      logger.error(err);
    } else {
      logger.info("[chrome] Finished");
    }
  }
);

if (exports) {
  module.exports = engine;
}
