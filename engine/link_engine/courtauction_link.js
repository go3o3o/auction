const puppeteer = require("puppeteer");
const moment = require("moment");
const fs = require("fs");
const path = require("path");

const logger = require("../../lib/logger");

// TO DO LIST
// 1. md5 파일 조회 (가장 마지막으로 저장한 사건 url)
// 2. 1번 url 이후의 url 수집
// 3. md5 파일에 2번 url 로 저장

const engine = (() => {
  const execute = function(params, callback) {
    let requestUrl = params.requestUrl;
    const customer = params.customer;
    const userAgent = params.userAgent;
    const startDt = params.startDt;
    const endDt = params.endDt;
    const collectDataPath = params.collectDataPath;
    const injectScripts = params.injectScripts;
    const linkSelectors = params.rule.linkSelectors;
    const docSelectors = params.rule.docSelectors;

    const now = moment();
    const saYear = moment().format("YYYY");
    const termStartDt = moment(startDt).format("YYYY.MM.DD");
    const termEndDt = moment(endDt).format("YYYY.MM.DD");
    const srnID = "PNO102001";
    let pageNum = 1;
    let onGoingFlag = false;

    // 브라우저 런치
    puppeteer
      .launch({
        headless: true
      })
      .then(async browser => {
        const page = await browser.newPage();

        // 유저에이전트
        await page.setUserAgent(userAgent);

        try {
          let parameter = {};
          parameter.saYear = moment().format("YYYY");
          parameter.srnID = srnID;
          parameter.termEndDt = termEndDt;
          parameter.termStartDt = termStartDt;

          // await page.setRequestInterception(true);
          // page.on("request", interceptedRequest => {
          //   let overrides = {
          //     method: "POST",
          //     postData: JSON.stringify(parameter)
          //   };
          //   interceptedRequest.continue(overrides);
          // });

          // 뷰 포트 설정
          await page.setViewport({
            width: 1920,
            height: 1080
          });

          requestUrl += `saYear=${saYear}&srnID=${srnID}&termEndDt=${termEndDt}&termStartDt=${termStartDt}`;

          logger.debug("[chrome] Step #1. URL 접근");
          logger.debug("[chrome] ### requestUrl: " + requestUrl);
          await page.goto(requestUrl);

          logger.debug("[chrome] Step #2. 스크립트 인젝팅");
          for (let injectScript of injectScripts) {
            logger.debug("[chrome] ### injectScriptPathw: " + injectScript);
            await page.addScriptTag({
              path: injectScript
            });
          }

          // 리스트 추출
          logger.debug("[chrome] Step #3. 문서링크 추출");

          let lists = await page.evaluate(function(selectors) {
            return __parseList(selectors);
          }, linkSelectors);

          console.log(lists);

          if (lists === null) {
            await browser.close();
            throw Error("LIST_PARSING_RULE_IS_NOT_MATCH");
          } else if (lists.length === 0) {
            await browser.close();
            throw Error("NO_RESULTS");
          } else {
            logger.debug(
              "[chrome] ### pageNum: " +
                pageNum +
                ", listCount: " +
                lists.length
            );

            let collectList = [];

            for (let list of lists) {
              collectList.push(list);
            }

            if (collectList.length > 0) {
              const fileName =
                "L-" +
                pageNum +
                "-" +
                now.format("YYYYMMDDHHmm-ssSSS") +
                ".json";
              logger.debug("[chrome] Step #4. 저장");

              let folderPath =
                collectDataPath + customer + "/" + now.format("YYYYMMDD");
              if (!fs.existsSync(folderPath)) {
                await fs.mkdirSync(folderPath);
              }

              logger.debug(
                "[chrome] ### filePath: " + folderPath + "/" + fileName
              );
              await fs.writeFile(
                folderPath + "/" + fileName,
                JSON.stringify(collectList),
                err => {
                  if (err) throw err;
                }
              );
            }

            if (onGoingFlag) {
              pageNum++;
              await page.waitFor(pagingInterval);
            } else {
              await browser.close();
              throw Error("SUCCESSFULLY_COLLECTED");
            }
          }
        } catch (error) {
          await browser.close();
          throw error;
        }

        // 브라우저 닫기
        logger.debug("[chrome] Step #11. 수집 종료");
        await browser.close();
        callback(null);
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
      "/Users/yoni/d-platform/30.DMap/00.workspace/auction/collect_data/linkCollector/",
    userAgent:
      "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)",
    source: "",
    injectScripts: [
      "../inject_script/listParser.js",
      "../inject_script/documentParser.js",
      "../inject_script/datetimeParser.js"
    ],
    rule: {
      linkSelectors: {
        crawlerInterval: 3000,
        listSelector: "tr[class^=Ltbl_list_lvl] td.txtleft div[class^=tbl_btm]",
        linkSelector: "a:first-child",
        linkAttr: "javascript:onclick",
        linkPatternRegex: "\\(\\'(.*)\\'\\,.*\\'(.*)\\'\\,",
        linkPattern:
          "https://www.courtauction.go.kr/RetrieveRealEstCarHvyMachineMulDetailInfo.laf?saNo=#2#&jiwonNm=#1#",
        pagingInterval: 3000
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
