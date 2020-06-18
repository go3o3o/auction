/**
 * 첨부파일 파싱
 * @param       {jsonObj} selectors 첨부파일 파싱 셀렉터
 * @param       {element} header    첨부파일 파싱 대상 영역
 */
function __parseAttachment(selectors, header) {
  console.log("__parseAttachment");

  var lists = [];

  // 첨부파일 리스트를 얻어옴
  if (header !== null && header !== undefined) {
    lists = header.querySelectorAll(selectors.attachListSelector);
  } else {
    lists = document.querySelectorAll(selectors.attachListSelector);
  }

  // 도메인 주소를 얻어옴
  var domain = window.location.hostname;
  var referer = document.URL;

  // http가 없을 경우 도메인에 붙여줌
  if (domain.indexOf("http") === -1 && domain.indexOf("https") === -1) {
    if (selectors.attachSSLCheck === "Y") {
      domain = "https://" + domain;
    } else {
      domain = "http://" + domain;
    }
  }

  // 첨부파일 리스트 파싱
  return Array.prototype.map.call(lists, function(e) {
    var a;

    // 첨부파일 영역 선택 셀렉터가 있을 경우 한번 더 첨부파일 영역 축소
    if (selectors.attachSelector !== undefined) {
      a = e.querySelector(selectors.attachSelector);
    } else {
      a = e;
    }

    // 첨부파일 링크 추출을 위한 속성이 있을 경우 링크 파싱
    if (selectors.attachAttr !== undefined) {
      // 링크 추출 시 옵션 적용 [옵션]:[속성]
      var attrs = selectors.attachAttr.split(":");

      // 옵션이 있을 경우
      if (attrs.length === 2) {
        // 상대경로로 표현 되어 도메인을 붙여줌
        if (attrs[0] === "abs") {
          var attachLink = a.getAttribute(attrs[1]);
          var attachName = "";

          if (selectors.attachNameSelector !== undefined) {
            // 첨부파일 이름을 객체에서 추출
            var attachNameElement = e.querySelector(
              selectors.attachNameSelector
            );

            // 자식 노드를 가비지라고 가정하고 제거
            for (
              var idx = 0;
              idx < attachNameElement.childNodes.length;
              idx++
            ) {
              if (attachNameElement.childNodes[idx].nodeType !== 3) {
                attachNameElement.removeChild(
                  attachNameElement.childNodes[idx]
                );
              }
            }

            attachName = attachNameElement.innerText;
          } else if (selectors.attachNameAttr !== undefined) {
            // 첨부파일 이름을 속성에서 추출
            attachName = a.getAttribute(selectors.attachNameAttr);
          } else if (selectors.attachNameLink) {
            // 첨부파일 링크가 첨부파일 명인 경우
            attachName = attachLink;
          } else {
            // 첨부파일 이름을 첨부파일 객체 텍스트에서 추출
            for (var idx = 0; idx < a.length; idx++) {
              if (a.childNodes[idx].nodeType !== 3) {
                a.removeChild(a.childNodes[idx]);
              }
            }
            attachName = a.innerText;
          }

          // 도메인을 붙여줌
          if (selectors.attachFullLinkSelector !== undefined) {
            attachLink = a.href;
          } else {
            attachLink = domain + attachLink;
          }

          // 첨부파일이름에 정규표현식 적용
          if (selectors.attachNameRegex !== undefined) {
            var regex = new RegExp(selectors.attachNameRegex);
            var matched = regex.exec(attachName);

            if (matched !== null && matched !== undefined) {
              attachName = matched[1];
            }
          }

          // 파일 끝 공백 제거
          if (attachName.length - 1 === attachName.lastIndexOf(" ")) {
            attachName = attachName.substring(0, attachName.length - 1);
          }

          return {
            referer: referer,
            link: attachLink,
            name: attachName,
            uuid: __getUUID()
          };
        } else if (attrs[0] === "javascript") {
          // 자바스크립트처리 된 첨부파일 파싱
          var script = a.getAttribute(attrs[1]);
          var attachName = "";

          if (selectors.attachNameSelector !== undefined) {
            // 첨부파일 이름을 객체에서 추출
            var attachNameElement = e.querySelector(
              selectors.attachNameSelector
            );

            for (
              var idx = 0;
              idx < attachNameElement.childNodes.length;
              idx++
            ) {
              if (attachNameElement.childNodes[idx].nodeType !== 3) {
                attachNameElement.removeChild(
                  attachNameElement.childNodes[idx]
                );
              }
            }

            attachName = attachNameElement.innerText;
          } else if (selectors.attachNameAttr !== undefined) {
            // 첨부파일 이름을 속성에서 추출
            attachName = a.getAttribute(selectors.attachNameAttr);
          } else if (selectors.attachNameLink) {
            // 첨부파일 링크가 첨부파일 명인 경우
            attachName = attachLink;
          } else {
            // 첨부파일 이름을 첨부파일 객체 텍스트에서 추출
            for (var idx = 0; idx < a.length; idx++) {
              if (a.childNodes[idx].nodeType !== 3) {
                a.removeChild(a.childNodes[idx]);
              }
            }
            attachName = a.innerText;
          }

          // 첨부파일명 정규표현식 적용
          if (selectors.attachNameRegex !== undefined) {
            var regex = new RegExp(selectors.attachNameRegex);
            var matched = regex.exec(attachName);

            if (matched !== null && matched !== undefined) {
              if (selectors.attachNamePattern !== undefined) {
                var replaceString = selectors.attachNamePattern;

                // '#[그룹]#'으로 표현 된 표현 변환
                for (var idx = 1; idx < matched.length; idx++) {
                  var regexStr = "#" + idx + "#";
                  var regexp = new RegExp(regexStr, "g");

                  replaceString = replaceString.replace(regexp, matched[idx]);
                }

                attachName = replaceString;
              } else {
                attachName = matched[1];
              }
            }
          }

          // 첨부파일 이름 끝 공백 제거
          if (attachName.length - 1 === attachName.lastIndexOf(" ")) {
            attachName = attachName.substring(0, attachName.length - 1);
          }

          return {
            referer: referer,
            script: script,
            name: attachName,
            uuid: __getUUID()
          };
        }
      } else {
        // 절대경로로 표현 된 첨부파일 링크 파싱
        var attachLink = a.getAttribute(attrs[0]);
        var attachName = "";

        if (selectors.attachNameSelector !== undefined) {
          // 첨부파일 이름을 객체에서 추출
          var attachNameElement = e.querySelector(selectors.attachNameSelector);

          for (var idx = 0; idx < attachNameElement.childNodes.length; idx++) {
            if (attachNameElement.childNodes[idx].nodeType !== 3) {
              attachNameElement.removeChild(attachNameElement.childNodes[idx]);
            }
          }

          attachName = attachNameElement.innerText;
        } else if (selectors.attachNameAttr !== undefined) {
          // 첨부파일 이름을 속성에서 추출
          attachName = a.getAttribute(selectors.attachNameAttr);
        } else if (selectors.attachNameLink) {
          // 첨부파일 링크가 첨부파일 명인 경우
          attachName = attachLink;
        } else {
          // 첨부파일 이름을 첨부파일 객체 텍스트에서 추출
          for (var idx = 0; idx < a.length; idx++) {
            if (a.childNodes[idx].nodeType !== 3) {
              a.removeChild(a.childNodes[idx]);
            }
          }
          attachName = a.innerText;
        }

        // 첨부파일명 정규표현식 적용
        if (selectors.attachNameRegex !== undefined) {
          var regex = new RegExp(selectors.attachNameRegex);
          var matched = regex.exec(attachName);

          if (matched !== null && matched !== undefined) {
            if (selectors.attachNamePattern !== undefined) {
              var replaceString = selectors.attachNamePattern;

              // '#[그룹]#'으로 표현 된 표현 변환
              for (var idx = 1; idx < matched.length; idx++) {
                var regexStr = "#" + idx + "#";
                var regexp = new RegExp(regexStr, "g");

                replaceString = replaceString.replace(regexp, matched[idx]);
              }

              attachName = replaceString;
            } else {
              attachName = matched[1];
            }
          }
        }

        // 첨부파일명 끝 공백 제거
        if (attachName.length - 1 === attachName.lastIndexOf(" ")) {
          attachName = attachName.substring(0, attachName.length - 1);
        }

        return {
          referer: referer,
          link: attachLink,
          name: attachName,
          uuid: __getUUID()
        };
      }
    } else {
      return null;
    }
  });
} // __parseAttachment

/**
 * 문서 URL에서 첨부파일 정보 추출
 * @param       {jsonObj} selectors 첨부파일 셀렉터
 * @param       {string} string 문서 URL
 */
function __getAttachmentByLink(selectors, string) {
  console.log("__getAttachmentByLink");
  var referer = document.URL;
  var attachLink = "";
  var attachName = "";

  if (
    selectors.attachSearchExtension !== undefined &&
    selectors.attachNewExtension !== undefined
  ) {
    attachLink = string.replace(
      selectors.attachSearchExtension,
      selectors.attachNewExtension
    );
  } else {
    attachLink = string;
  }

  var b = attachLink.lastIndexOf("/");
  if (b > 0) {
    attachName = attachLink.substr(b + 1);
  } else {
    attachName = attachLink;
  }

  if (attachLink === "" && attachName === "") {
    return null;
  } else {
    return {
      referer: referer,
      link: attachLink,
      name: attachName,
      uuid: __getUUID()
    };
  }
} // __getAttachmentByLink

/**
 * 첨부파일 URL 정규식 변환
 * @param       {jsonObj} selectors 첨부파일 셀렉터
 * @param       {string} string    정규식 적용할 대상 URL 텍스트
 */
function __parseAttachLink(selectors, string) {
  console.log("__parseAttachLink");

  // 정규표현식, 패턴이 있을 경우
  if (
    selectors.attachLinkPatternRegex !== undefined &&
    selectors.attachLinkPattern !== undefined
  ) {
    var replaceString = string;

    var regex = new RegExp(selectors.attachLinkPatternRegex);
    var matched = regex.exec(string);

    if (matched !== null && matched !== undefined) {
      replaceString = selectors.attachLinkPattern;

      // '#[그룹]#'으로 표현 된 표현 변환
      for (var idx = 1; idx < matched.length; idx++) {
        var regexStr = "#" + idx + "#";
        var regexp = new RegExp(regexStr, "g");

        replaceString = replaceString.replace(regexp, matched[idx]);
      }
    }

    return replaceString;
  }
} // __parseAttachLink

/**
 * 특정 객체를 클릭하여 다운로드
 * @param       {element} e 클릭 엘레먼트
 */
// function __downloadElement(e) {
//   console.log('__downloadElement');
//   e.click();
//   return true;
// } // __downloadElement

/**
 * UUID 파일명 출출
 */
function __getUUID() {
  console.log("__getUUID");

  function s4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  }
  return (
    s4() +
    s4() +
    "-" +
    s4() +
    "-" +
    s4() +
    "-" +
    s4() +
    "-" +
    s4() +
    s4() +
    s4() +
    ".file"
  );
} // __getUUID
