/**
 * 리스트 파싱
 * @param       {jsonObj} selectors 날짜 파싱 룰
 */
function __parseList(selectors) {
  console.log("__parseList");
  var lists = [];

  if (selectors.iframeSelector !== undefined) {
    // IFrame에서 원문 추출
    var iframeSelectors = selectors.iframeSelector.split(" ");
    var frameDocument;

    for (var idx = 0; idx < iframeSelectors.length; idx++) {
      if (idx === 0) {
        frameDocument = document.querySelector(iframeSelectors[idx])
          .contentDocument;
      } else {
        frameDocument = frameDocument.querySelector(iframeSelectors[idx])
          .contentDocument;
      }
    }

    if (selectors.listNoResultSelector !== undefined) {
      var noResultElement = frameDocument.querySelector(
        selectors.listNoResultSelector
      );

      if (noResultElement !== null) {
        if (selectors.listNoResultText !== undefined) {
          var noResultText = noResultElement.textContent;

          if (noResultText === selectors.listNoResultText) {
            return [];
          }
        } else {
          return [];
        }
      }
    }

    // 돔 파싱에러일 경우 N리턴되는 문제, 모든 스크립트에 N처리 필요
    // 게시판에 게시물이 없는 경우.
    // if(frameDocument.querySelectorAll(selectors.listCheckSelector).length >= 1 ){
    //   return "N";
    // }

    // 불필요한 엘리먼트 제거
    if (selectors.removeListSelector !== undefined) {
      var removeListElement = frameDocument.querySelectorAll(
        selectors.removeListSelector
      );

      for (var idx = 0; idx < removeListElement.length; idx++) {
        if (selectors.removeParent !== undefined) {
          if (selectors.removeParent) {
            __findParentBySelector(
              removeListElement[idx],
              selectors.listSelector,
              frameDocument
            ).parentNode.removeChild(
              __findParentBySelector(
                removeListElement[idx],
                selectors.listSelector,
                frameDocument
              )
            );
          } else {
            removeListElement[idx].parentNode.removeChild(
              removeListElement[idx]
            );
          }
        } else {
          removeListElement[idx].parentNode.removeChild(removeListElement[idx]);
        }
      }
    }

    if (selectors.secretSelector !== undefined) {
      // 비밀글 제거 (IF - 소비자뉴스용)
      var secret = frameDocument.querySelectorAll(selectors.secretSelector);
      if (secret !== null && secret !== undefined) {
        for (var idx; idx < secret.length; idx++) {
          secret.parentNode.parentNode.parentNode.removeChild(
            secret[idx].parentNode.parentNode
          );
        }
      }
    }

    lists = frameDocument.querySelectorAll(selectors.listSelector);
  } else {
    if (selectors.listNoResultSelector !== undefined) {
      var noResultElement = document.querySelector(
        selectors.listNoResultSelector
      );

      if (noResultElement !== null) {
        if (selectors.listNoResultText !== undefined) {
          var noResultText = noResultElement.textContent.trim();

          if (noResultText === selectors.listNoResultText) {
            return [];
          }
        } else {
          return [];
        }
      }
    }

    // 게시판에 게시물이 없는 경우.
    // if(document.querySelectorAll(selectors.listCheckSelector).length >= 1 ){
    //   return "N";
    // }

    // 불필요한 엘리먼트 제거
    if (selectors.removeListSelector !== undefined) {
      var removeListElement = document.querySelectorAll(
        selectors.removeListSelector
      );

      for (var idx = 0; idx < removeListElement.length; idx++) {
        if (selectors.removeParent !== undefined) {
          if (selectors.removeParent) {
            __findParentBySelector(
              removeListElement[idx],
              selectors.listSelector,
              frameDocument
            ).parentNode.removeChild(
              __findParentBySelector(
                removeListElement[idx],
                selectors.listSelector,
                frameDocument
              )
            );
          } else {
            removeListElement[idx].parentNode.removeChild(
              removeListElement[idx]
            );
          }
        } else {
          removeListElement[idx].parentNode.removeChild(removeListElement[idx]);
        }
      }
    }

    if (selectors.secretSelector !== undefined) {
      // 비밀글 제거 (IF - 소비자뉴스용)
      var secret = document.querySelectorAll(selectors.secretSelector);
      if (secret !== null && secret !== undefined) {
        for (var idx = 0; idx < secret.length; idx++) {
          secret[idx].parentNode.parentNode.parentNode.removeChild(
            secret[idx].parentNode.parentNode
          );
        }
      }
    }

    lists = document.querySelectorAll(selectors.listSelector);
  }

  return Array.prototype.map.call(lists, function(e) {
    var referer = document.URL;
    var origin = location.origin;
    var linkAttrs = selectors.linkAttr.split(":");
    var link = origin;

    if (
      selectors.secretSelector !== undefined &&
      selectors.secretSelector !== null
    ) {
      var secret = e.querySelector(selectors.secretSelector);
      if (secret !== null) {
        return null;
      }
    }

    if (
      selectors.existSelector !== undefined &&
      selectors.existSelector !== null
    ) {
      var exist = e.querySelector(selectors.existSelector);
      if (exist === null) {
        return undefined;
      }
    }

    if (linkAttrs.length > 1) {
      if (linkAttrs[0] === "abs") {
        var subLink = e
          .querySelector(selectors.linkSelector)
          .getAttribute(linkAttrs[1]);

        // ./경로 제거
        if (subLink.indexOf(".") === 0) {
          subLink = subLink.substring(1, subLink.length);
        }

        // link경로에 없는 주소 붙여줌
        if (selectors.linkSubDomain !== undefined) {
          if (
            subLink.indexOf("/") !== 0 &&
            link.lastIndexOf("/") !== link.length - 1
          ) {
            subLink = "/" + subLink;
          }

          subLink = selectors.linkSubDomain + subLink;
        }

        // 누락 된 '/' 붙여줌
        if (
          subLink.indexOf("/") !== 0 &&
          link.lastIndexOf("/") !== link.length - 1
        ) {
          subLink = "/" + subLink;
        }

        link += subLink;

        if (
          selectors.linkPatternRegex !== undefined &&
          selectors.linkPattern !== undefined
        ) {
          var linkPattern = new RegExp(selectors.linkPatternRegex);
          var matched = linkPattern.exec(link);

          if (matched !== null && matched !== undefined) {
            var replaceLink = selectors.linkPattern;

            for (var idx = 1; idx < matched.length; idx++) {
              var regexStr = "#" + idx + "#";
              var regexp = new RegExp(regexStr, "g");

              replaceLink = replaceLink.replace(regexp, matched[idx]);
            }

            link = replaceLink;
          }
        }
      } else if (linkAttrs[0] === "javascript") {
        if (
          selectors.linkPatternRegex !== undefined &&
          selectors.linkPattern !== undefined
        ) {
          link = e
            .querySelector(selectors.linkSelector)
            .getAttribute(linkAttrs[1]);

          link = link.replace(/\t/g, "").replace(/\n/g, "");

          var linkPattern = new RegExp(selectors.linkPatternRegex);
          var matched = linkPattern.exec(link);

          if (matched !== null && matched !== undefined) {
            var replaceLink = selectors.linkPattern;

            for (var idx = 1; idx < matched.length; idx++) {
              var regexStr = "#" + idx + "#";
              var regexp = new RegExp(regexStr, "g");

              replaceLink = replaceLink.replace(regexp, matched[idx]);
            }

            link = replaceLink;
          }
        }
      }
    } else {
      if (linkAttrs[0] === "text") {
        link = e.querySelector(selectors.linkSelector).innerText.trim();
      } else {
        var linkSub = e.querySelector(selectors.linkSelector);
        if (linkSub !== undefined && linkSub !== null) {
          link = linkSub.getAttribute(linkAttrs[0]);
        } else {
          return;
        }
      }
    }

    // URL 인코딩 처리
    if (selectors.usedUrlEncode !== undefined) {
      if (selectors.usedUrlEncode) {
        link = encodeURI(link);
      }
    }

    // 요약문 추출
    var desc = "";
    if (selectors.descSelector !== undefined) {
      desc = e.querySelector(selectors.descSelector);

      if (selectors.descAttr !== undefined) {
        desc = desc.getAttribute(selectors.descAttr);
      } else {
        desc = desc.textContent;
      }
    }

    if (selectors.datetimeSelector !== undefined) {
      var datetimeTxt = e.querySelector(selectors.datetimeSelector).textContent;

      if (selectors.datetimeTextParse !== undefined) {
        if (selectors.datetimeTextParse) {
          var datetimeElements = e.querySelector(selectors.datetimeSelector)
            .childNodes;
          datetimeTxt = "";

          for (var idx = 0; idx < datetimeElements.length; idx++) {
            if (datetimeElements[idx].nodeType === 3) {
              // Text 타입
              datetimeTxt += datetimeElements[idx].textContent;
            }
          }
        }
      }

      if (
        selectors.datetimeRegex !== undefined &&
        selectors.datetimePattern !== undefined
      ) {
        var datetimePattern = new RegExp(selectors.datetimeRegex);
        var matched = datetimePattern.exec(datetimeTxt);
        if (matched !== null && matched !== undefined) {
          var replaceTime = selectors.datetimePattern;
          for (var idx = 1; idx < matched.length; idx++) {
            var regexStr = "#" + idx + "#";
            var regexp = new RegExp(regexStr, "g");
            replaceTime = replaceTime.replace(regexp, matched[idx]);
          }
          datetimeTxt = replaceTime;
        }
      }

      var datetime = __parseDatetime(datetimeTxt);

      return {
        referer: referer,
        link: link,
        datetimeTxt: datetimeTxt,
        datetime: datetime
      };
    } else if (selectors.datetimeIndex !== undefined) {
      var datetimeTxt = "";

      if (selectors.datetimeIndex === 0) {
        datetimeTxt = e.textContent.trim();
      } else if (selectors.datetimeIndex > 0) {
        var datetimeTxt = e.textContent.trim();
        var nextSibling = e.nextSibling;
        var index = 0;

        while (nextSibling && index < selectors.datetimeIndex) {
          if (nextSibling.nodeType === 3) {
            //nodeType === 3이면 다음 태그로 이동.
            nextSibling = nextSibling.nextSibling;
          } else if (nextSibling.nodeType === 1) {
            // p태그.
            index++;
          }

          // if(nextSibling.nodeType === 1) {
          //   index++;
          //   nextSibling = nextSibling.nextSibling;
          // }

          if (index === selectors.datetimeIndex) {
            datetimeTxt = nextSibling.textContent;
          }
        }
      } else if (selectors.datetimeIndex < 0) {
        var datetimeTxt = e.textContent.trim();
        var previousSibling = e.previousSibling;
        var index = 0;

        while (previousSibling && index > selectors.datetimeIndex) {
          if (previousSibling.nodeType === 1) {
            index--;

            previousSibling = previousSibling.previousSibling;
          }

          if (index === selectors.datetimeIndex) {
            datetimeTxt = previousSibling.textContent;
          }
        }
      }

      if (
        selectors.datetimeRegex !== undefined &&
        selectors.datetimePattern !== undefined
      ) {
        var datetimePattern = new RegExp(selectors.datetimeRegex);
        var matched = datetimePattern.exec(datetimeTxt);

        if (matched !== null && matched !== undefined) {
          var replaceTime = selectors.datetimePattern;

          for (var idx = 1; idx < matched.length; idx++) {
            var regexStr = "#" + idx + "#";
            var regexp = new RegExp(regexStr, "g");

            replaceTime = replaceTime.replace(regexp, matched[idx]);
          }

          datetimeTxt = replaceTime;
        }
      }

      var datetime = __parseDatetime(datetimeTxt);

      return {
        referer: referer,
        link: link,
        datetimeTxt: datetimeTxt,
        datetime: datetime
      };
    } else if (selectors.datetimeAttr !== undefined) {
      var datetimeTxt = e.getAttribute(selectors.datetimeAttr);
      var datetime = __parseDatetime(datetimeTxt);

      return {
        referer: referer,
        link: link,
        datetimeTxt: datetimeTxt,
        datetime: datetime
      };
    } else {
      return {
        referer: referer,
        link: link,
        desc: desc
      };
    }
  });
} // __parseList

/**
 * 2019-05-30 작성자 이재훈
 * 마지막 페이지 무한 루틴 이슈를 해결하기 위한
 * 전체 검색 결과 개수 파싱 함수 추가
 * @param {jsonObj}  selectors 파싱 룰
 */
function __parseTotalResCnt(selectors) {
  if (selectors.resultCntSelector === undefined) {
    return null;
  } else {
    let totalResCntSelector = document.querySelector(
      selectors.resultCntSelector
    );

    if (totalResCntSelector !== null && totalResCntSelector !== undefined) {
      let totalResCntStr = totalResCntSelector.innerText;
      if (totalResCntStr.includes(",") === true) {
        totalResCntStr = totalResCntStr.replace(",", "");
      }
      if (totalResCntStr.includes("약") === true) {
        totalResCntStr = totalResCntStr.replace("약", "");
      }
      totalResCntStr = totalResCntStr.substring(
        totalResCntStr.indexOf("/") + 1,
        totalResCntStr.indexOf("건")
      );
      return totalResCntStr;
    } else {
      return null;
    }
  }
}
/**
 * 순차적 리스트 삭제를 위한 함수
 * @param {jsonObj} linkSelectors 링크 셀렉터
 */
function __parseSequntialRemoveLink(selectors) {
  if (selectors.linkSelector !== undefined) {
    // 맨 위 리스트 URL 추출
    const removeTarget = document.querySelector(selectors.linkSelector);
    if (
      removeTarget !== null ||
      removeTarget !== undefined ||
      removeTarget !== ""
    ) {
      removeTarget.parentNode.removeChild(removeTarget);
    }
  }
}

/**
 * 대상 엘리먼트가 맞는지 확인
 * @param       {Object} a 대상 엘리먼트1
 * @param       {Object} b 대상 엘리먼트2
 */
function __collectionHas(a, b) {
  //helper function (see below)
  for (var i = 0, len = a.length; i < len; i++) {
    if (a[i] === b) return true;
  }
  return false;
}

/**
 * 부모노드를 찾는 함수
 * @param       {Object} elm           대상 엘리먼트
 * @param       {[type]} selector      CSS Selectors
 * @param       {[type]} frameDocument 대상 영역
 */
function __findParentBySelector(elm, selector, frameDocument) {
  var all;
  if (frameDocument !== undefined) {
    all = frameDocument.querySelectorAll(selector);
  } else {
    all = document.querySelectorAll(selector);
  }

  var cur = elm.parentNode;
  while (cur && !__collectionHas(all, cur)) {
    //keep going up until you find a match
    cur = cur.parentNode; //go up
  }
  return cur; //will return null if not found
}

/**
 * 2020-03-19 작성자: 유다정
 * page 번호가 전체 페이지 수의 역순일 경우
 * @param {jsonObj}  selectors 파싱 룰
 */
function __parseTotalPageCnt(selectors) {
  let totalPageCnt = 1;
  if (
    selectors.totalPageCntSelector !== undefined &&
    selectors.paginationSelector !== undefined
  ) {
    const totalPageCntSelector = document.querySelector(
      selectors.totalPageCntSelector
    );
    const paginationSelector = document.querySelectorAll(
      selectors.paginationSelector
    );

    if (paginationSelector.length >= 12) {
      totalPageCnt = totalPageCntSelector.text;
    } else if (
      paginationSelector.length > 0 &&
      paginationSelector.length <= 10
    ) {
      totalPageCnt = paginationSelector.length;
    }
  }
  return totalPageCnt;
}
