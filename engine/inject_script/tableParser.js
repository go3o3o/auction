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

function __parseTable(selectors) {
  console.log("__parseTable");
  var result = [];
  var data = {};
  var frameDocument;

  if (selectors.iframeSelector !== undefined) {
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
          removeListElement[idx].parentNode.removeChild(removeListElement[idx]);
        }
      } else {
        removeListElement[idx].parentNode.removeChild(removeListElement[idx]);
      }
    }
  }

  var tableArea;
  if (frameDocument !== undefined) {
    if (selectors.tableRemoveSelector !== undefined) {
      var removeListElement = frameDocument.querySelectorAll(
        selectors.tableRemoveSelector
      );

      for (var idx = 0; idx < removeListElement.length; idx++) {
        removeListElement[idx].parentNode.removeChild(removeListElement[idx]);
      }
    }

    tableArea = frameDocument.querySelector(selectors.documentSelector);
  } else {
    if (selectors.tableRemoveSelector !== undefined) {
      var removeListElement = document.querySelectorAll(
        selectors.tableRemoveSelector
      );

      for (var idx = 0; idx < removeListElement.length; idx++) {
        removeListElement[idx].parentNode.removeChild(removeListElement[idx]);
      }
    }

    tableArea = document.querySelector(selectors.documentSelector);
  }

  if (selectors.tableSelector === undefined) {
    selectors.tableSelector = "table";
  }

  if (__notNull(selectors.titleSelector)) {
    var titleElement = tableArea.querySelector(selectors.titleSelector);
    var title = "";

    if (__notNull(titleElement)) {
      title = titleElement.innerText
        .trim()
        .replace(/\t/g, "")
        .replace(/\n/g, "");
    }

    data.doc_title = title;
  }

  result.push(data);

  var tableElems = tableArea.querySelectorAll(selectors.tableSelector);
  //   var tableElems = tableArea.querySelector(selectors.tableSelector);

  // 디폴트 행 우선 순회 파싱
  for (var idx = 0; idx < 1; idx++) {
    if (selectors.tableHeaderSelector === undefined) {
      selectors.tableHeaderSelector = "thead";
    }

    if (selectors.tableHeaderRowSelector === undefined) {
      selectors.tableHeaderRowSelector = "tr";
    }

    if (selectors.tableHeaderCellSelector === undefined) {
      selectors.tableHeaderCellSelector = "th";
    }

    // 헤더 추출
    var header = tableElems[idx].querySelector(selectors.tableHeaderSelector);
    var headers;

    if (selectors.tableHeaderSelector === selectors.tableHeaderRowSelector) {
      headers = header.querySelectorAll(selectors.tableHeaderCellSelector);
    } else {
      headers = header
        .querySelector(selectors.tableHeaderRowSelector)
        .querySelectorAll(selectors.tableHeaderCellSelector);
    }

    headers = Array.prototype.map.call(headers, function(e) {
      var value;

      if (selectors.tableHeaderHtmlParse !== undefined) {
        if (selectors.tableHeaderHtmlParse) {
          value = e.innerText.trim();
        } else if (!selectors.tableHeaderHtmlParse) {
          value = e.innerHTML.trim();
        }
      } else {
        value = e.innerText.trim();
      }

      return {
        value: value,
        rowspan: parseInt(
          e.getAttribute("rowspan") === null
            ? 1
            : e.getAttribute("rowspan").trim()
        ),
        colspan: parseInt(
          e.getAttribute("colspan") === null
            ? 1
            : e.getAttribute("colspan").trim()
        )
      };
    });

    if (selectors.tableBodySelector === undefined) {
      selectors.tableBodySelector = "tbody";
    }

    if (selectors.tableBodyRowSelector === undefined) {
      selectors.tableBodyRowSelector = "tr";
    }

    if (selectors.tableBodyCellSelector === undefined) {
      selectors.tableBodyCellSelector = "td";
    }

    // 바디 추출
    var bodys = tableElems[idx].querySelectorAll(selectors.tableBodySelector);
    var rows = [];
    var rowKeys = [];

    // 로우 추출
    for (var bodyIdx = 0; bodyIdx < bodys.length; bodyIdx++) {
      rows = rows.concat(
        Array.prototype.slice.call(
          bodys[bodyIdx].querySelectorAll(selectors.tableBodyRowSelector)
        )
      );
    }

    var startRowIdx = 0;
    if (selectors.tableBodyRowStartIdx !== undefined) {
      startRowIdx = selectors.tableBodyRowStartIdx;
    }

    var startColIdx = 0;
    if (selectors.tableBodyColStartIdx !== undefined) {
      startColIdx = selectors.tableBodyColStartIdx;
    }

    // 로우 순회
    for (var rowIdx = startRowIdx; rowIdx < rows.length; rowIdx++) {
      // var cells = rows[rowIdx].querySelectorAll(selectors.tableBodyCellSelector);
      var cells = Array.prototype.map.call(
        rows[rowIdx].querySelectorAll(selectors.tableBodyCellSelector),
        function(e) {
          return {
            value: e.innerText.trim(),
            rowspan: parseInt(
              e.getAttribute("rowspan") === null
                ? 1
                : e.getAttribute("rowspan").trim()
            ),
            colspan: parseInt(
              e.getAttribute("colspan") === null
                ? 1
                : e.getAttribute("colspan").trim()
            )
          };
        }
      );

      // cells = Array.prototype.slice.call(cells).slice(startColIdx, cells.length);
      cells = cells.slice(startColIdx, cells.length);

      // 셀 순회
      var cellColSpanIdx = 0;
      var cellRowSpanIdx = 0;

      for (var cellIdx = 0; cellIdx < cells.length; cellIdx++) {
        data = {};
        var key = headers[cellIdx].value;
        // var key = headers[cellIdx].value;
        // var key = headers[cellIdx].innerText;
        // var key = __getKey(headers, cellIdx, 'COL').value;
        var value = cells[cellIdx].value.replace(/\n/g, "");

        data.key = key;
        data.value = value;
        result.push(data);
      } //Cols
    } // Rows

    // if (Object.keys(data).length !== 0) {
    //   result.push(data);
    // }
  }

  return JSON.stringify(result);
}

function __getKey(keys, index, type) {
  var idxSum = 0;
  var key;

  for (var idx = 0; idx < keys.length; idx++) {
    var span;

    if (type === "ROW") {
      span = keys[idx].rowspan;
    } else if (type === "COL") {
      span = keys[idx].colspan;
    }

    idxSum += span;

    if (index < idxSum) {
      key = keys[idx];
      break;
    }
  }

  return key;
}
