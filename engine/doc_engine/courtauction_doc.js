const querystring = require("querystring");
const puppeteer = require("puppeteer");
const moment = require("moment");
const fs = require("fs-extra");
const md5 = require("md5");
const iconv = require("iconv-lite");

const logger = require("../../lib/logger");

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

// TD DO LIST
// attach 매각물건명세서는 맥북에서 다운로드가 안됨
// 추후 window 에서 테스트해볼 것

const engine = (function() {
  const __download = async (url, filename) => {
    return new Promise((resolve, reject) => {
      axios({
        method: "GET",
        url: url,
        responseType: "stream"
      })
        .then(response => {
          let stream = response.data.pipe(fs.createWriteStream(filename));
          stream.on("finish", function() {
            resolve();
          });
        })
        .catch(error => {
          reject(error);
        });
    });
  };
  const execute = function(params, callback) {
    const collectDataPath = params.collectDataPath;
    const userAgent = params.userAgent;
    const customer = params.customer;
    const source = params.source;
    const injectScripts = params.injectScripts;
    const docSelectors = params.rule.docSelectors;
    const linkSelectors = params.rule.linkSelectors;
    const attachSelectors = params.rule.attachSelectors;
    const crawlerInterval = linkSelectors.crawlerInterval;

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

        logger.debug("[chrome] Step #1. link 리스트 배열에 담기");
        const linkCollectorPath =
          collectDataPath + "linkCollector/" + customer + "/";
        logger.debug(" ### linkCollector Path :: " + linkCollectorPath);
        let linkCollectors = [];
        getFiles(linkCollectorPath, linkCollectors);

        logger.debug("[chrome] Step #2. link url 파싱해서 배열에 담기");
        let links = [];
        for (linkCollector of linkCollectors) {
          let jsons = fs.readJSONSync(linkCollector);
          for (json of jsons) {
            let param = querystring.parse(json.link);

            // EUC-KR 인코딩
            var strUtf8Query = decodeURIComponent(param.jiwonNm);
            var buf = iconv.encode(strUtf8Query, "euc-kr");
            var encodeStr = "";
            for (var i = 0; i < buf.length; i++) {
              encodeStr += "%" + buf[i].toString("16");
            }
            encodeStr = encodeStr.toUpperCase();

            json.link = json.link.replace(param.jiwonNm, encodeStr);
            // logger.info(json.link);
            links.push(json.link);
          }
        }
        logger.debug(" ### " + links.length);

        try {
          // 수집된 링크 만큼 for문 돌기
          for (link of links) {
            // 수집 URL 접근
            logger.debug("[chrome] Step #3. URL 접근");
            logger.debug("[chrome] url : " + link);
            await page.goto(link);

            for (let idx = 0; idx < injectScripts.length; idx++) {
              await page.addScriptTag({
                path: injectScripts[idx]
              });
              logger.debug(
                "[chrome] Step #2. 인젝트 스크립트 로딩 " + injectScripts[idx]
              );
            }

            // 문서 추출
            logger.debug("[chrome] Step #4. 문서 파싱");
            var result = await page.evaluate(function(selectors) {
              return __parseTable(selectors);
            }, docSelectors);

            logger.info(result);
            let attachFileName = result.doc_title.split(": ")[2];

            // 첨부파일 추출
            logger.debug("[chrome] Step #5. 첨부파일 추출");
            const attachs = await page.evaluate(function(selectors) {
              return __parseAttachment(selectors);
            }, attachSelectors);

            logger.info(attachs);

            for (const attach of attachs) {
              if (
                attach.link !== null &&
                attach.name !== null &&
                attach.uuid !== null
              ) {
                let folderPath =
                  collectDataPath +
                  "attachCollector/" +
                  customer +
                  "/" +
                  now.format("YYYYMMDD");

                if (!fs.existsSync(folderPath)) {
                  await fs.mkdirSync(folderPath);
                }

                const fileName = folderPath + "/" + attachFileName;

                let attachLink = await page.evaluate(
                  function(selectors, str) {
                    return __parseAttachLink(selectors, str);
                  },
                  attachSelectors,
                  attach.script
                );

                logger.debug("[chrome] ### attachName: " + attachFileName);
                logger.debug("[chrome] ### attachLink: " + attachLink);
                logger.debug("[chrome] ### attachRealName: " + attach.uuid);
                logger.debug("[chrome] ### SavePath: " + fileName);

                // try {
                //   await __download(attachLink, fileName);
                // } catch (e) {
                //   await browser.close();
                //   throw Error("FAILED_ATTACH_DOWNLOAD");
                // }
              }
            }

            if (result === null) {
              await browser.close();
              throw Error("DOCUMENT_PARSING_RULE_IS_NOT_MATCH");
            } else if (Object.keys(result).length === 0) {
              await browser.close();
              throw Error("DOCUMENT_PARSING_RULE_IS_NOT_MATCH");
            } else {
              result.doc_url = link;

              result.source = source;
              result.customer_id = customer;
              result.uuid = md5(link);

              // 첨부파일 메타 정보 저장
              if (attachs !== null) {
                result.attachs = [];
                for (const attach of attachs) {
                  result.attachs.push({
                    file_url: attach.link,
                    file_path: fileName
                  });
                }
              }

              // 저장
              const fileName =
                "D-1-" + now.format("YYYYMMDDHHmm-ssSSS") + ".json";
              logger.debug("[chrome] Step #6. 저장 ");
              let folderPath =
                collectDataPath +
                "docCollector/" +
                customer +
                "/" +
                now.format("YYYYMMDD");

              if (!fs.existsSync(folderPath)) {
                await fs.mkdirSync(folderPath);
              }

              logger.debug(
                "[chrome] ### filePath: " + folderPath + "/" + fileName
              );
              await fs.writeFile(
                folderPath + "/" + fileName,
                JSON.stringify(result),
                err => {
                  if (err) throw err;
                }
              );
            }
          }

          // 브라우저 닫기
          logger.debug("[chrome] Step #7. 수집 종료");
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
    startDt: "2020-06-10",
    endDt: "2020-06-16",
    customer: "courtauction",
    collectDataPath:
      "/Users/yoni/d-platform/30.DMap/00.workspace/auction/collect_data/",
    userAgent:
      "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)",
    source: "대한민국 법원경매정보",
    injectScripts: [
      "../inject_script/listParser.js",
      "../inject_script/tableParser.js",
      "../inject_script/datetimeParser.js",
      "../inject_script/attachParser.js"
    ],
    rule: {
      linkSelectors: {
        crawlerInterval: 3000,
        listSelector: "tr[class^=Ltbl_list_lvl] td.txtleft div[class^=tbl_btm]",
        linkSelector: "a:first-child",
        linkAttr: "javascript:onclick",
        linkPatternRegex: "\\(\\'(.*)\\'\\,\\'(.*)\\'\\,\\'(.*)\\'\\)",
        linkPattern:
          "https://www.courtauction.go.kr/RetrieveRealEstCarHvyMachineMulDetailInfo.laf?saNo=#2#&jiwonNm=#1#"
      },
      // attach: 매각물건명세서
      docSelectors: {
        // iframeSelector: "frame[name=indexFrame]",
        documentSelector: "div#contents",
        titleSelector: "div#search_title ul",
        tableHeaderSelector: "tbody",
        tableHeaderRowSelector: "tr",
        tableHeaderCellSelector: "th",
        tableColKeySelector: "tr",
        tableBodySelector: "tbody",
        tableBodyRowSelector: "tr",
        tableBodyCellSelector: "td"
      },
      attachSelectors: {
        attachListSelector: "div.table_contents > div.tbl_btn",
        attachSelector: "a",
        attachAttr: "javascript:onclick",
        attachLinkPatternRegex:
          "\\(\\'(.*)\\'\\,.*\\'(.*)\\'\\,.*\\'(.*)\\'\\,.*\\'(.*)\\'\\,.*\\'(.*)\\'\\)",
        // attachLinkPattern:
        //   "http://orv.scourt.go.kr/orv/erv300/erv301.jsp?hJiwonNm=#3#&hSaNo=#4#&hMaemulSer=#5#&hOrvParam=#2#"
        attachLinkPattern:
          "http://orv.scourt.go.kr/orv/erv300/erv301.jsp?orvParam=#2#"
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
