/**
 * HTML 엔티티 코드 파싱
 * @param       {string} str 본문
 */
function __decodeEntityCode(str) {
  console.log("__decodeEntityCode");
  // 임시 TextArea를 생성하여 엔티티 코드 파싱
  var textAreaElement = document.createElement("textarea");
  textAreaElement.innerHTML = str;
  return textAreaElement.value;
} // __decodeEntityCode

function __replaceHtmlEntities() {
  var translate_re = /&(nbsp|amp|quot|lt|gt);/g;
  var translate = {
    nbsp: " ",
    amp: "&",
    quot: '"',
    lt: "<",
    gt: ">"
  };
  return function(s) {
    return s.replace(translate_re, function(match, entity) {
      return translate[entity];
    });
  };
} // __replaceHtmlEntities

/**
 * 오브젝트 NOT NULL 체크
 * @param       {Object} obj 오브젝트
 */
function __notNull(obj) {
  if (obj !== null && obj !== undefined) {
    return true;
  } else {
    return false;
  }
}

/**
 * 원문 파싱
 * @param       {jsonObj} selectors CSS Selectors
 */
function __parseDocument(selectors) {
  console.log("__parseDocument");
  var result = {};

  // instagram retroactive의 경우 url 파싱
  if (__notNull(selectors.isInstagram)) {
    var url = document.location.href;
    result.doc_url = url;
  }

  // IFrame 파싱
  var frameDocument;
  if (__notNull(selectors.iframeSelector)) {
    // IFrame에서 원문 추출
    var frameSelectors = selectors.iframeSelector.split(" ");

    for (var idx = 0; idx < frameSelectors.length; idx++) {
      if (idx === 0) {
        frameDocument = document.querySelector(frameSelectors[idx])
          .contentDocument;
      } else {
        frameDocument = frameDocument.querySelector(frameSelectors[idx])
          .contentDocument;
      }
    }
  }

  if (__notNull(selectors.frameSelector)) {
    frameDocument = document.querySelector(selectors.frameSelector)
      .contentWindow;
  }

  // 본문 영역 추출
  var header;
  if (__notNull(frameDocument)) {
    header = frameDocument.querySelector(selectors.documentSelector);
  } else {
    header = document.querySelector(selectors.documentSelector);
  }

  if (__notNull(selectors.instaDocNoResultSelector)) {
    var noResult = document.querySelector(selectors.instaDocNoResultSelector);
    if (__notNull(noResult)) {
      return {};
    }
  }

  if (!__notNull(header)) {
    return null;
  }

  if (__notNull(selectors.documentNoResultSelector)) {
    var noResult = header.querySelector(selectors.documentNoResultSelector);

    if (__notNull(noResult)) {
      return {};
    }
  }
  // 미디어사 텍스트 추출 - 뉴스mediaSelector
  if (__notNull(selectors.mediaSelector)) {
    var mediaElement = header.querySelector(selectors.mediaSelector);
    var media = "";

    if (mediaElement === null || mediaElement === undefined) {
      result.media = "";
    } else {
      if (__notNull(selectors.mediaAttr)) {
        media = mediaElement
          .getAttribute(selectors.mediaAttr)
          .trim()
          .replace(/\t/g, "")
          .replace(/\n/g, "");
      } else {
        media = mediaElement.textContent
          .trim()
          .replace(/\t/g, "")
          .replace(/\n/g, "");
      }
      result.media = media;
    }
  }

  // 기사 원문 추출 - 뉴스
  if (__notNull(selectors.articleOriginSelector)) {
    var articleElement = header.querySelector(selectors.articleOriginSelector);
    var article_url = "";

    if (articleElement === null || articleElement === undefined) {
      result.original_article = "";
    } else {
      if (__notNull(selectors.articleAttr)) {
        article_url = articleElement.getAttribute(selectors.articleAttr);
      }
      result.original_article = article_url;
    }
  }

  // 2019-05-09
  // 작성자 : 이재훈
  // 네이버 블로그 전용 타이틀 수집 로직 추가
  if (__notNull(selectors.naverBlogTitleSelector)) {
    try {
      var titleElement = header.querySelector(selectors.naverBlogTitleSelector);
      var title = "";

      if (__notNull(selectors.noTitleChildSelector)) {
        title = titleElement.childNodes[0].textContent
          .trim()
          .replace(/\t/g, "")
          .replace(/\n/g, "");
      } else {
        for (var idx = 0; idx < titleElement.childNodes.length; idx++) {
          if (titleElement.childNodes[idx].nodeType === 3) {
            //titleElement.removeChild(titleElement.childNodes[idx]);
            title += titleElement.childNodes[idx].data
              .trim()
              .replace(/\t/g, "")
              .replace(/\n/g, "");
          } else if (titleElement.childNodes[idx].nodeType === 1) {
            title += titleElement.childNodes[idx].textContent
              .trim()
              .replace(/\t/g, "")
              .replace(/\n/g, "");
          }
        }
      }
      result.doc_title = title;
    } catch (error) {
      // Rule이 적합하지 않아 에러가 발생할 경우 null 리턴
      return null;
    }
  }

  // 제목 추출
  if (__notNull(selectors.titleSelector)) {
    var titleElement = header.querySelector(selectors.titleSelector);
    var title = "";

    if (__notNull(selectors.noTitleChildSelector)) {
      title = titleElement.childNodes[0].textContent
        .trim()
        .replace(/\t/g, "")
        .replace(/\n/g, "");
    } else {
      for (var idx = 0; idx < titleElement.childNodes.length; idx++) {
        if (titleElement.childNodes[idx].nodeType === 3) {
          //titleElement.removeChild(titleElement.childNodes[idx]);
          title += titleElement.childNodes[idx].data
            .trim()
            .replace(/\t/g, "")
            .replace(/\n/g, "");
        } else if (titleElement.childNodes[idx].nodeType === 1) {
          title += titleElement.childNodes[idx].textContent
            .trim()
            .replace(/\t/g, "")
            .replace(/\n/g, "");
        }
      }
    }

    result.doc_title = title;
  }

  // 본문 추출
  if (__notNull(selectors.contentIframeSelector)) {
    // IFrame에서 원문 추출
    var iframeSelectors = selectors.contentIframeSelector.split(" ");
    var iframeDocument;

    for (var idx = 0; idx < iframeSelectors.length; idx++) {
      if (idx == 0) {
        if (__notNull(frameDocument)) {
          iframeDocument = frameDocument.querySelector(iframeSelectors[idx])
            .contentDocument;
        } else {
          iframeDocument = document.querySelector(iframeSelectors[idx])
            .contentDocument;
        }
      } else {
        iframeDocument = iframeDocument.querySelector(iframeSelectors[idx])
          .contentDocument;
      }
    }

    // 불필요한 영역 제거
    if (__notNull(selectors.removeSelector)) {
      const removeArea = iframeDocument.querySelector(selectors.removeSelector);
      if (__notNull(removeArea)) {
        removeArea.parentNode.removeChild(removeArea);
      }
    }

    if (__notNull(selectors.contentSelector)) {
      var contentElements = iframeDocument.querySelectorAll(
        selectors.contentSelector
      );
      var content = "";

      if (__notNull(contentElements)) {
        for (var idx = 0; idx < contentElements.length; idx++) {
          // HTML 파싱 여부
          if (__notNull(selectors.contentHtmlParse)) {
            if (!selectors.contentHtmlParse) {
              content += contentElements[idx].innerHTML
                .replace(/\t/g, "")
                .replace(/\n/g, "")
                .replace(/&nbsp;/g, " ");
            } else {
              if (__notNull(selectors.contentNoSpace)) {
                content += contentElements[idx].innerText;
              } else {
                content += contentElements[idx].innerText
                  .replace(/\n/g, "")
                  .replace(/\t/g, "")
                  .replace(/\xA0/g, " ");
              }
            }
          } else {
            if (__notNull(selectors.contentNoSpace)) {
              content += contentElements[idx].innerText;
            } else {
              content += contentElements[idx].innerText
                .replace(/\n/g, "")
                .replace(/\t/g, "")
                .replace(/\xA0/g, " ");
            }
          }

          content += " ";
        }

        if (__notNull(selectors.contentEntityDecode)) {
          content = selectors.contentEntityDecode
            ? __decodeEntityCode(content)
            : content;
        }
      }
    }

    // HTML 파싱 여부
    // if (selectors.contentHtmlParse !== undefined) {
    //   if (!selectors.contentHtmlParse) {
    //     content = iframeDocument.querySelector(selectors.contentSelector).innerHTML.replace(/\n/g, '').replace(/\t/g, '');
    //   } else {
    //     content = iframeDocument.querySelector(selectors.contentSelector).innerText.replace(/\n/g, '').replace(/\t/g, '');
    //   }
    // } else {
    //   content = iframeDocument.querySelector(selectors.contentSelector).innerText.replace(/\n/g, '').replace(/\t/g, '');
    // }

    result.doc_content = content;
  } else {
    // 불필요한 영역 제거
    if (__notNull(selectors.removeSelector)) {
      const removeArea = document.querySelector(selectors.removeSelector);
      if (__notNull(removeArea)) {
        removeArea.parentNode.removeChild(removeArea);
      }
    }

    // 다음 블로그 - 브런치 전용 원문 수집 룰
    if (__notNull(selectors.brunchContentSelector)) {
      var content = "";
      content = document
        .querySelector(selectors.brunchContentSelector)
        .innerText.replace(/\n/g, "")
        .replace(/\t/g, "")
        .replace(/\xA0/g, " ");
      result.doc_content = content;
    }

    // 다음 블로그 - 블로그 전용 원문 수집 룰
    if (__notNull(selectors.daumBlogContentSelector)) {
      var content = "";
      var tmpIframeContentDoc = frameDocument
        .querySelector("div#wrap")
        .querySelector("iframe").contentDocument;
      content = tmpIframeContentDoc.querySelector("div#contentDiv").innerText;
      content = content
        .replace(/\n/g, "")
        .replace(/\t/g, "")
        .replace(/\xA0/g, " ");
      result.doc_content = content;
    }

    // 원문 추출
    if (__notNull(selectors.contentSelector)) {
      var contentElements = header.querySelectorAll(selectors.contentSelector);
      var content = "";

      if (__notNull(contentElements)) {
        for (var idx = 0; idx < contentElements.length; idx++) {
          // HTML 파싱 여부
          if (__notNull(selectors.contentHtmlParse)) {
            if (!selectors.contentHtmlParse) {
              content += contentElements[idx].innerHTML
                .replace(/\t/g, "")
                .replace(/\n/g, "")
                .replace(/&nbsp;/g, " ");
            } else {
              if (__notNull(selectors.contentNoSpace)) {
                content += contentElements[idx].innerText;
              } else {
                content += contentElements[idx].innerText
                  .replace(/\n/g, "")
                  .replace(/\t/g, "")
                  .replace(/\xA0/g, " ");
              }
            }
          } else {
            if (__notNull(selectors.contentNoSpace)) {
              content += contentElements[idx].innerText;
            } else {
              content += contentElements[idx].innerText
                .replace(/\n/g, "")
                .replace(/\t/g, "")
                .replace(/\xA0/g, " ");
            }
          }

          content += " ";
        }

        if (__notNull(selectors.contentEntityDecode)) {
          content = selectors.contentEntityDecode
            ? __decodeEntityCode(content)
            : content;
        }
      }

      result.doc_content = content;
    }
  }

  // 네이버 지식인 답변 추출
  if (__notNull(selectors.answerListSelector)) {
    var kinAnswerList = header.querySelectorAll(selectors.answerListSelector);
    answerJson = [];

    if (kinAnswerList.length > 0) {
      for (let idx = 0, len = kinAnswerList.length; idx < len; idx++) {
        answerJson[idx] = kinAnswerList[idx].innerText
          .replace(/\n/g, "")
          .replace(/\t/g, "")
          .replace(/\xA0/g, " ");
      }
    }
    result.answer_list = answerJson;
  }

  // 작성자 추출
  if (__notNull(selectors.writerSelector)) {
    var writerElements = header.querySelectorAll(selectors.writerSelector);
    var writer = "";

    if (__notNull(writerElements)) {
      for (var idx = 0; idx < writerElements.length; idx++) {
        if (__notNull(selectors.useWriterBr)) {
          writer = writer + writerElements[idx].innerText;
        } else {
          writer =
            writer +
            writerElements[idx].innerText.replace(/\n/g, "").replace(/\t/g, "");
        }
      }

      if (__notNull(selectors.writerRegex)) {
        var writerRegex = new RegExp(selectors.writerRegex);
        var matched = writerRegex.exec(writer);

        if (__notNull(matched)) {
          writer = matched[1];
        }
      }
    }

    result.doc_writer = writer.trim();
  }

  // 날짜 추출
  if (__notNull(selectors.datetimeSelector)) {
    var datetimeElement = header.querySelector(selectors.datetimeSelector);
    var datetime = "";

    if (__notNull(datetimeElement)) {
      if (__notNull(selectors.datetimeRegex)) {
        var datetimeRegex = new RegExp(selectors.datetimeRegex);
        var matched = datetimeRegex.exec(datetimeElement.innerText);

        if (__notNull(matched)) {
          datetime = __parseDatetime(matched[1]);
        } else {
          datetime = __parseDatetime(datetimeElement.innerText);
        }
      } else if (__notNull(selectors.datetimeAttr)) {
        datetime = __parseDatetime(
          datetimeElement.getAttribute(selectors.datetimeAttr).trim()
        );
      } else if (__notNull(selectors.isConsumer)) {
        datetime = datetimeElement.innerText.replace("년 ", ".");
        datetime = datetime.replace("월 ", ".");
        datetime = datetime.replace("일", "");
        datetime = datetime.replace(/\s.*요일/g, "");
        datetime = __parseDatetime(datetime);
      } else {
        datetime = __parseDatetime(datetimeElement.innerText);
      }
    }

    result.doc_datetime = datetime;
  }

  // 조회수 추출
  if (__notNull(selectors.viewCountSelector)) {
    var viewCount = header.querySelector(selectors.viewCountSelector);

    if (__notNull(viewCount)) {
      if (__notNull(selectors.viewCountRegex)) {
        var viewCountRegex = new RegExp(selectors.viewCountRegex);
        var matched = viewCountRegex.exec(
          viewCount.textContent.trim().replace(/,/g, "")
        );

        if (__notNull(matched)) {
          result.view_count = parseInt(matched[1]);
        }
      } else {
        result.view_count = parseInt(
          viewCount.textContent.trim().replace(/,/g, "")
        );
      }
    } else {
      result.view_count = 0;
    }
  }
  //댓글 수 추출
  if (__notNull(selectors.commentCountSelector)) {
    var commentCount = header.querySelector(selectors.commentCountSelector);

    if (__notNull(commentCount)) {
      if (__notNull(selectors.commentCountRegex)) {
        var commentCountRegex = new RegExp(selectors.commentCountRegex);
        var matched = commentCountRegex.exec(
          commentCount.textContent.trim().replace(/,/g, "")
        );

        if (__notNull(matched)) {
          result.comment_count = parseInt(matched[1]);
        }
      } else {
        result.comment_count = parseInt(
          commentCount.textContent.trim().replace(/,/g, "")
        );
      }
    } else {
      result.comment_count = 0;
    }
  }
  // 좋아요수 추출
  if (__notNull(selectors.likeCountSelector)) {
    var likeCount = header.querySelector(selectors.likeCountSelector);

    if (__notNull(likeCount)) {
      if (__notNull(selectors.likeCountRegex)) {
        var likeCountRegex = new RegExp(selectors.likeCountRegex);
        var matched = likeCountRegex.exec(
          likeCount.textContent.trim().replace(/,/g, "")
        );

        if (__notNull(matched)) {
          result.like_count = parseInt(matched[1]);
        }
      } else {
        result.like_count = parseInt(
          likeCount.textContent.trim().replace(/,/g, "")
        );
      }
    } else {
      result.like_count = 0;
    }
  }
  // 훈훈해요수 추출
  if (__notNull(selectors.warmCountSelector)) {
    var warmCount = header.querySelector(selectors.warmCountSelector);

    if (__notNull(warmCount)) {
      if (__notNull(selectors.warmCountRegex)) {
        var warmCountRegex = new RegExp(selectors.warmCountRegex);
        var matched = warmCountRegex.exec(
          warmCount.textContent.trim().replace(/,/g, "")
        );

        if (__notNull(matched)) {
          result.warm_count = parseInt(matched[1]);
        }
      } else {
        result.warm_count = parseInt(
          warmCount.textContent.trim().replace(/,/g, "")
        );
      }
    } else {
      result.warm_count = 0;
    }
  }
  // 슬퍼요수 추출
  if (__notNull(selectors.sadCountSelector)) {
    var sadCount = header.querySelector(selectors.sadCountSelector);

    if (__notNull(sadCount)) {
      if (__notNull(selectors.sadCountRegex)) {
        var sadCountRegex = new RegExp(selectors.sadCountRegex);
        var matched = sadCountRegex.exec(
          sadCount.textContent.trim().replace(/,/g, "")
        );

        if (__notNull(matched)) {
          result.sad_count = parseInt(matched[1]);
        }
      } else {
        result.sad_count = parseInt(
          sadCount.textContent.trim().replace(/,/g, "")
        );
      }
    } else {
      result.sad_count = 0;
    }
  }
  // 화나요수 추출
  if (__notNull(selectors.angryCountSelector)) {
    var angryCount = header.querySelector(selectors.angryCountSelector);

    if (__notNull(angryCount)) {
      if (__notNull(selectors.angryCountRegex)) {
        var angryCountRegex = new RegExp(selectors.angryCountRegex);
        var matched = angryCountRegex.exec(
          angryCount.textContent.trim().replace(/,/g, "")
        );

        if (__notNull(matched)) {
          result.angry_count = parseInt(matched[1]);
        }
      } else {
        result.angry_count = parseInt(
          angryCount.textContent.trim().replace(/,/g, "")
        );
      }
    } else {
      result.angry_count = 0;
    }
  }
  // 후속기사 원해요수 추출
  if (__notNull(selectors.wantCountSelector)) {
    var wantCount = header.querySelector(selectors.wantCountSelector);

    if (__notNull(wantCount)) {
      if (__notNull(selectors.wantCountRegex)) {
        var wantCountRegex = new RegExp(selectors.wantCountRegex);
        var matched = wantCountRegex.exec(
          wantCount.textContent.trim().replace(/,/g, "")
        );

        if (__notNull(matched)) {
          result.want_count = parseInt(matched[1]);
        }
      } else {
        result.want_count = parseInt(
          wantCount.textContent.trim().replace(/,/g, "")
        );
      }
    } else {
      result.want_count = 0;
    }
  }
  // 기사 추천수 추출
  if (__notNull(selectors.recommendCountSelector)) {
    var recommendCount = header.querySelector(selectors.recommendCountSelector);

    if (__notNull(recommendCount)) {
      if (__notNull(selectors.recommendCountRegex)) {
        var recommendCountRegex = new RegExp(selectors.recommendCountRegex);
        var matched = recommendCountRegex.exec(
          recommendCount.textContent.trim().replace(/,/g, "")
        );

        if (__notNull(matched)) {
          result.recommend_count = parseInt(matched[1]);
        }
      } else {
        result.recommend_count = parseInt(
          recommendCount.textContent.trim().replace(/,/g, "")
        );
      }
    } else {
      result.recommend_count = 0;
    }
  }
  // 싫어요수 추출
  if (__notNull(selectors.dislikeCountSelector)) {
    var dislikeCount = header.querySelector(selectors.dislikeCountSelector);

    if (__notNull(dislikeCount)) {
      if (__notNull(selectors.dislikeCountRegex)) {
        var dislikeCountRegex = new RegExp(selectors.dislikeCountRegex);
        var matched = dislikeCountRegex.exec(
          dislikeCount.textContent.trim().replace(/,/g, "")
        );

        if (__notNull(matched)) {
          result.dislike_count = parseInt(matched[1]);
        }
      } else {
        result.dislike_count = parseInt(
          dislikeCount.textContent.trim().replace(/,/g, "")
        );
      }
    } else {
      result.dislike_count = 0;
    }
  }

  // 댓글수 추출
  if (__notNull(selectors.commentCountSelector)) {
    var commentCount = header.querySelector(selectors.commentCountSelector);

    if (__notNull(commentCount)) {
      if (__notNull(selectors.commentCountRegex)) {
        var commentCountRegex = new RegExp(selectors.commentCountRegex);
        var matched = commentCountRegex.exec(
          commentCount.textContent.trim().replace(/,/g, "")
        );

        if (__notNull(matched)) {
          result.comment_count = parseInt(matched[1]);
        }
      } else {
        result.comment_count = parseInt(
          commentCount.textContent.trim().replace(/,/g, "")
        );
      }
    } else {
      result.comment_count = 0;
    }
  }

  // 인스타그램 댓글 수 추출
  if (__notNull(selectors.InstaCommentCountSelector)) {
    var commentCount = document.querySelectorAll(
      selectors.InstaCommentCountSelector
    ).length;

    if (__notNull(commentCount)) {
      result.comment_count = commentCount;
    } else {
      result.comment_count = 0;
    }
  }

  // 위치 추출
  if (__notNull(selectors.locationSelector)) {
    var locations = header.querySelector(selectors.locationSelector);

    if (__notNull(locations)) {
      result.locations = locations.textContent
        .trim()
        .replace(/\n/g, "")
        .replace(/\t/g, "");
    }
  }

  // 커스텀 태그 추출
  if (__notNull(selectors.custom1Selector)) {
    var custom1Element = header.querySelector(selectors.custom1Selector);
    var custom1 = "";

    if (__notNull(selectors.removeCustom1Selector)) {
      let custom1removeElement = header.querySelector(
        selectors.removeCustom1Selector
      );

      if (custom1removeElement !== null && custom1removeElement !== undefined) {
        custom1Element.removeChild(custom1removeElement);
      }
    }

    if (__notNull(custom1Element)) {
      custom1 = custom1Element.innerText
        .replace(/\n/g, "")
        .replace(/\t/g, "")
        .trim();
    }

    if (__notNull(selectors.custom1Name)) {
      result[selectors.custom1Name] = custom1;
    } else {
      result.custom1 = custom1;
    }
  }

  if (__notNull(selectors.custom2Selector)) {
    var custom2Element = header.querySelector(selectors.custom2Selector);
    var custom2 = "";

    if (__notNull(custom2Element)) {
      custom2 = custom2Element.innerText
        .replace(/\n/g, "")
        .replace(/\t/g, "")
        .trim();
    }

    if (__notNull(selectors.custom2Name)) {
      result[selectors.custom2Name] = custom2;
    } else {
      result.custom2 = custom2;
    }
  }

  if (__notNull(selectors.custom3Selector)) {
    var custom3Element = header.querySelector(selectors.custom3Selector);
    var custom3 = "";

    if (__notNull(custom3Element)) {
      custom3 = custom3Element.innerText
        .replace(/\n/g, "")
        .replace(/\t/g, "")
        .trim();
    }

    if (__notNull(selectors.custom3Name)) {
      result[selectors.custom3Name] = custom3;
    } else {
      result.custom3 = custom3;
    }
  }

  if (__notNull(selectors.custom4Selector)) {
    var custom4Element = header.querySelector(selectors.custom4Selector);
    var custom4 = "";

    if (__notNull(custom3Element)) {
      custom4 = custom4Element.innerText
        .replace(/\n/g, "")
        .replace(/\t/g, "")
        .trim();
    }

    if (__notNull(selectors.custom4Name)) {
      result[selectors.custom4Name] = custom4;
    } else {
      result.custom4 = custom4;
    }
  }

  // 결과데이터가 있는 경우 result 리턴
  if (Object.keys(result).length === 0) {
    return null;
  } else {
    return result;
  }
} // __parseDocument

/**
 * 다이어로그 타입 리스트 파싱
 * @param       {jsonObj} linkSelectors   링크 셀렉터
 * @param       {jsonObj} docSelectors    원문 셀렉터
 * @param       {jsonObj} attachSelectors 첨부파일 셀렉터
 */
function __parseDialogList(linkSelectors, docSelectors, attachSelectors) {
  console.log("__parseDialogList");

  // IFrame 파싱
  var frameDocument;
  if (__notNull(linkSelectors.iframeSelector)) {
    // IFrame에서 원문 추출
    var frameSelectors = linkSelectors.iframeSelector.split(" ");

    for (var idx = 0; idx < frameSelectors.length; idx++) {
      if (idx === 0) {
        frameDocument = document.querySelector(frameSelectors[idx])
          .contentDocument;
      } else {
        frameDocument = frameDocument.querySelector(frameSelectors[idx])
          .contentDocument;
      }
    }
  }

  var lists = [];
  if (__notNull(frameDocument)) {
    lists = frameDocument.querySelectorAll(linkSelectors.listSelector);

    if (__notNull(linkSelectors.listNoResultSelector)) {
      var noResult = frameDocument.querySelector(
        linkSelectors.listNoResultSelector
      );

      if (__notNull(noResult)) {
        return [];
      }
    }
  } else {
    lists = document.querySelectorAll(linkSelectors.listSelector);

    if (__notNull(linkSelectors.listNoResultSelector)) {
      var noResult = document.querySelector(linkSelectors.listNoResultSelector);

      if (__notNull(noResult)) {
        return [];
      }
    }
  }

  return Array.prototype.map.call(lists, function(e) {
    var referer = document.URL;
    var origin = location.origin;
    var link = origin;

    var dialog = {};

    // 제목 추출
    if (__notNull(docSelectors.titleSelector)) {
      var titleElement = e.querySelector(docSelectors.titleSelector);
      var title = "";

      if (__notNull(docSelectors.notTtleChildSelector)) {
        title = titleElement.childNodes[0].textContent
          .trim()
          .replace(/\t/g, "")
          .replace(/\n/g, "");
      } else {
        for (var idx = 0; idx < titleElement.childNodes.length; idx++) {
          if (titleElement.childNodes[idx].nodeType === 3) {
            // Text 타입
            title += titleElement.childNodes[idx].data
              .trim()
              .replace(/\n/g, "")
              .replace(/\t/g, "");
          } else if (titleElement.childNodes[idx].nodeType === 3) {
            // Tag 타입
            title += titleElement.childNodes[idx].textContent
              .trim()
              .replace(/\n/g, "")
              .replace(/\t/g, "");
          }
        }
      }

      dialog.doc_title = title;
    }

    // 원문 추출
    if (__notNull(docSelectors.contentSelector)) {
      var contentElements = e.querySelectorAll(docSelectors.contentSelector);
      var content = "";

      if (__notNull(contentElements)) {
        for (var idx = 0; idx < contentElements.length; idx++) {
          // HTML 파싱 여부
          if (__notNull(linkSelectors.contentHtmlParse)) {
            if (!linkSelectors.contentHtmlParse) {
              content += contentElements[idx].innerHTML
                .replace(/\n/g, "")
                .replace(/\t/g, "");
            } else {
              content += contentElements[idx].innerText
                .replace(/\n/g, "")
                .replace(/\t/g, "");
            }
          } else {
            content += contentElements[idx].innerText
              .replace(/\n/g, "")
              .replace(/\t/g, "");
          }

          content += " ";
        }
      }

      dialog.doc_content = content;
    }

    // 커스텀 태그 추출
    if (__notNull(docSelectors.custom1Selector)) {
      var custom1Element = e.querySelector(docSelectors.custom1Selector);
      var custom1 = "";

      if (__notNull(custom1Element)) {
        custom1 = custom1Element.innerText
          .replace(/\n/g, "")
          .replace(/\t/g, "")
          .trim();
      }

      // 속성 추출
      if (__notNull(docSelectors.custom1Attr)) {
        custom1 = custom1Element.getAttribute(docSelectors.custom1Attr).trim();
      }

      if (__notNull(docSelectors.custom1Name)) {
        dialog[docSelectors.custom1Name] = custom1;
      } else {
        dialog.custom1 = custom1;
      }
    }

    if (__notNull(docSelectors.custom2Selector)) {
      var custom2Element = e.querySelector(docSelectors.custom2Selector);
      var custom2 = "";

      if (__notNull(custom2Element)) {
        custom2 = custom2Element.innerText
          .replace(/\n/g, "")
          .replace(/\t/g, "")
          .trim();
      }

      // 속성 추출
      if (__notNull(docSelectors.custom2Attr)) {
        custom2 = custom2Element.getAttribute(docSelectors.custom2Attr).trim();
      }

      if (__notNull(docSelectors.custom2Name)) {
        dialog[docSelectors.custom2Name] = custom2;
      } else {
        dialog.custom2 = custom2;
      }
    }

    if (__notNull(docSelectors.custom3Selector)) {
      var custom3Element = e.querySelector(docSelectors.custom3Selector);
      var custom3 = "";

      if (__notNull(custom3Element)) {
        custom3 = custom3Element.innerText
          .replace(/\n/g, "")
          .replace(/\t/g, "")
          .trim();
      }

      // 속성 추출
      if (__notNull(docSelectors.custom3Attr)) {
        custom3 = custom3Element.getAttribute(docSelectors.custom3Attr).trim();
      }

      if (__notNull(docSelectors.custom3Name)) {
        dialog[docSelectors.custom3Name] = custom3;
      } else {
        dialog.custom3 = custom3;
      }
    }

    if (__notNull(docSelectors.custom4Selector)) {
      var custom4Element = e.querySelector(docSelectors.custom4Selector);
      var custom4 = "";

      if (__notNull(custom4Element)) {
        custom4 = custom4Element.innerText
          .replace(/\n/g, "")
          .replace(/\t/g, "")
          .trim();
      }

      // 속성 추출
      if (__notNull(docSelectors.custom4Attr)) {
        custom4 = custom4Element.getAttribute(docSelectors.custom4Attr).trim();
      }

      if (__notNull(docSelectors.custom4Name)) {
        dialog[docSelectors.custom4Name] = custom4;
      } else {
        dialog.custom4 = custom4;
      }
    }

    if (__notNull(docSelectors.custom5Selector)) {
      var custom5Element = e.querySelector(docSelectors.custom5Selector);
      var custom5 = "";

      if (__notNull(custom5Element)) {
        custom5 = custom5Element.innerText
          .replace(/\n/g, "")
          .replace(/\t/g, "")
          .trim();
      }

      // 속성 추출
      if (__notNull(docSelectors.custom5Attr)) {
        custom5 = custom5Element.getAttribute(docSelectors.custom5Attr).trim();
      }

      if (__notNull(docSelectors.custom5Name)) {
        dialog[docSelectors.custom5Name] = custom5;
      } else {
        dialog.custom5 = custom5;
      }
    }

    if (__notNull(docSelectors.custom6Selector)) {
      var custom6Element = e.querySelector(docSelectors.custom6Selector);
      var custom6 = "";

      if (__notNull(custom6Element)) {
        custom6 = custom6Element.innerText
          .replace(/\n/g, "")
          .replace(/\t/g, "")
          .trim();
      }

      // 속성 추출
      if (__notNull(docSelectors.custom6Attr)) {
        custom6 = custom6Element.getAttribute(docSelectors.custom6Attr).trim();
      }

      if (__notNull(docSelectors.custom6Name)) {
        dialog[docSelectors.custom6Name] = custom6;
      } else {
        dialog.custom6 = custom6;
      }
    }

    // 날짜 추출
    if (__notNull(docSelectors.datetimeSelector)) {
      var datetimeElement = e.querySelector(docSelectors.datetimeSelector);
      var datetime = "";

      if (__notNull(datetimeElement)) {
        if (__notNull(docSelectors.datetimeRegex)) {
          var datetimeRegex = new RegExp(docSelectors.datetimeRegex);
          var matched = datetimeRegex.exec(datetimeElement.innerText);

          if (__notNull(matched)) {
            datetime = __parseDatetime(matched[1]);
          } else {
            datetime = __parseDatetime(datetimeElement.innerText);
          }
        } else if (__notNull(docSelectors.datetimeAttr)) {
          datetime = __parseDatetime(
            datetimeElement.getAttribute(docSelectors.datetimeAttr).trim()
          );
        } else {
          datetime = __parseDatetime(datetimeElement.innerText);
        }
      }

      dialog.doc_datetime = datetime;
    }

    // 작성자 추출
    if (__notNull(docSelectors.writerSelector)) {
      var writerElements = e.querySelectorAll(docSelectors.writerSelector);
      var writer = "";

      if (__notNull(writerElements)) {
        for (var idx = 0; idx < writerElements.length; idx++) {
          if (__notNull(docSelectors.useWriterBr)) {
            writer = writer + writerElements[idx].innerText;
          } else {
            writer =
              writer +
              writerElements[idx].innerText
                .replace(/\n/g, "")
                .replace(/\t/g, "");
          }
        }

        if (__notNull(docSelectors.writerRegex)) {
          var writerRegex = new RegExp(docSelectors.writerRegex);
          var matched = writerRegex.exec(writer);

          if (__notNull(matched)) {
            writer = matched[1];
          }
        }
      }

      dialog.doc_writer = writer.trim();
    }

    if (
      __notNull(linkSelectors.linkSelector) &&
      __notNull(linkSelectors.linkAttr)
    ) {
      var linkAttrs = linkSelectors.linkAttr.split(":");

      // 원문 URL 추출
      if (linkAttrs.length > 1) {
        if (linkAttrs[0] === "abs") {
          var subLink = e
            .querySelector(linkSelectors.linkSelector)
            .getAttribute(linkAttrs[1]);

          // ./ 형식의 URL 제거
          if (subLink.indexOf(".") === 0) {
            subLink = subLink.substring(1, subLink.length);
          }

          // 중간 도메인 추가
          if (__notNull(linkSelectors.linkSubDomain)) {
            if (subLink.indexOf("/") !== 0) {
              subLink = "/" + subLink;
            }

            subLink = linkSelectors.linkSubDomain + subLink;
          }

          // /형식 추가
          if (subLink.indexOf("/") !== 0) {
            subLink = "/" + subLink;
          }

          link = origin;
          link += subLink;
        } else if (linkAttrs[0] === "javascript") {
          if (
            __notNull(linkSelectors.linkPatternRegex) &&
            __notNull(linkSelectors.linkPattern)
          ) {
            link = e
              .querySelector(linkSelectors.linkSelector)
              .getAttribute(linkAttrs[1]);

            var linkPattern = new RegExp(linkSelectors.linkPatternRegex);
            var matched = linkPattern.exec(link);

            if (__notNull(matched)) {
              var replaceLink = linkSelectors.linkPattern;

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
        link = e
          .querySelector(linkSelectors.linkSelector)
          .getAttribute(linkAttrs[0]);
      }
    } else {
      link = referer;
    }

    if (__notNull(linkSelectors.pageNumSelector)) {
      var pageElement = document.querySelector(linkSelectors.pageNumSelector);
      var pageNumber = pageElement.innerText;

      dialog.pageNumber = pageNumber;
    }

    dialog.referer = referer;
    dialog.doc_url = link;

    // 첨부파일 추출
    if (__notNull(attachSelectors)) {
      dialog.attachs = __parseAttachment(attachSelectors, e);
    }

    return dialog;
  });
} // __parseDialogList
