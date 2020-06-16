const puppeteer = require("puppeteer");
const moment = require("moment");
const fs = require("fs");
const md5 = require("md5");
const path = require("path");

const logger = require("../../lib/logger");

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
    const crawlerInterval = linkSelectors.crawlerInterval;

    const now = moment();
    const saYear = moment().format("YYYY");
    // 입찰기일: 내일 ~ 일주일 후
    const termStartDt = moment()
      .add(1, "day")
      .format("YYYY.MM.DD");
    const termEndDt = moment()
      .add(7, "day")
      .format("YYYY.MM.DD");
    const srnID = "PNO102001";
    const lclsUtilCd = "0000802"; // 건물 > 주거용건물
    const mclsUtilCd = "000080201"; // 건물 > 주거용건물
    const gamEvalAmtGuganMax = "200000000"; // 감정평가액 (최대)
    const notifyMinMgakPrcMax = "200000000"; // 최저매각가격 (최대))
    let pageNum = 0;
    let onGoingFlag = true;

    let firstLink = true; // 맨 처음 url 인지 확인용

    const md5Path = "../md5/" + customer + ".out";
    let md5Save = "";
    let md5Check = ""; // 이전까지 수집된 url(md5) 값
    if (fs.existsSync(md5Path)) {
      md5Check = fs.readFileSync(md5Path);
    }

    // 브라우저 런치
    puppeteer
      .launch({
        headless: true
      })
      .then(async browser => {
        const page = await browser.newPage();

        // 유저에이전트
        await page.setUserAgent(userAgent);

        // 뷰 포트 설정
        await page.setViewport({
          width: 1920,
          height: 1080
        });

        try {
          while (onGoingFlag) {
            let requestUrl_ori = requestUrl;
            let targetRow = pageNum * 20 + 1;
            requestUrl_ori =
              requestUrl +
              `saYear=${saYear}&srnID=${srnID}&termEndDt=${termEndDt}&termStartDt=${termStartDt}` +
              `&lclsUtilCd=${lclsUtilCd}&mclsUtilCd=${mclsUtilCd}` +
              `&gamEvalAmtGuganMax=${gamEvalAmtGuganMax}&notifyMinMgakPrcMax=${notifyMinMgakPrcMax}&targetRow=${targetRow}`;

            logger.debug("[chrome] Step #1. URL 접근");
            logger.debug("[chrome] ### requestUrl: " + requestUrl_ori);
            await page.goto(requestUrl_ori);

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

            // logger.info(lists);

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

              logger.debug("[chrome] ### 저장된 md5 " + md5Check);
              for (let list of lists) {
                let linkMd5 = md5(list.link);
                list.md5 = linkMd5;
                if (firstLink) {
                  // 리스트의 맨 처음 url 을 md5 값으로 저장
                  md5Save = linkMd5;
                  firstLink = false;
                }

                // url 이랑 이전까지 수집된 url(md5) 값을 비교
                if (md5Check != linkMd5) {
                  collectList.push(list);
                } else {
                  onGoingFlag = false;
                  break;
                }
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
                  collectDataPath +
                  "linkCollector/" +
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
                  JSON.stringify(collectList),
                  err => {
                    if (err) throw err;
                  }
                );
                await fs.writeFileSync(md5Path, md5Save);
              } else {
                onGoingFlag = false;
              }

              if (onGoingFlag) {
                logger.debug("[chrome] Step #5. 페이징");
                pageNum++;

                // 페이징 인터벌
                await page.waitFor(crawlerInterval);
              } else {
                await browser.close();
                throw Error("SUCCESSFULLY_COLLECTED");
              }
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
      "/Users/yoni/d-platform/30.DMap/00.workspace/auction/collect_data/",
    userAgent:
      "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)",
    source: "대한민국 법원경매정보",
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
          "https://www.courtauction.go.kr/RetrieveRealEstCarHvyMachineMulDetailInfo.laf?saNo=#2#&jiwonNm=#1#"
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
