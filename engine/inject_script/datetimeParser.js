/**
 * 날짜 정규식 파싱
 * @param       {string} datetimeTxt 날짜
 */
function __parseDatetime(datetimeTxt) {
  console.log("__parseDatetime");
  var regxs = {
    datetime: /(\d{1,2})(?:\s)?(s|m|h|d|w|초|분|시간|일|주|달|개월|년)(?:\s?)(?:전|ago)?/,
    date: /(\d{2}|\d{4})(?:\.|-|\/|\s)+(\d{1,2})(?:\.|-|\/|\s)+(\d{1,2})?|(\d{1,2})(?:\.|-|\/|\s)(\d{1,2})|(\d{4})(\d{2})(\d{2})|(\d{2})(\d{2})(\d{2})/,
    time: /(\d{1,2})(?:\:)(\d{1,2})(?:\:)?(\d{1,2})?/,
    datestr: /([a-zA-Z]+)(?:\.|-|\/|\s)(\d{1,2})(?:,)(?:\.|-|\/|\s)(\d{2,4})|(\d{1,2})(?:\.|-|\/|\s)([a-zA-Z]+)(?:\.|-|\/|\s)(\d{2,4})|([a-zA-Z].*)\s(.*)\,\s(\d.*)/
  };

  /**
    1. datetime 정규표현식 검증
    초전
    분전
    시간전
    일전
    s ago
    m ago
    h ago
    d ago

    2. date 정규표현식 검증
    YYYYMM
    YYYY.MM
    YYYY-MM
    YYYY/MM
    YYYY MM
    YYYYMMDD
    YYYY.MM.DD
    YYYY-MM-DD
    YYYY/MM/DD
    YYYY MM DD
    YYMMDD
    YY.MM.DD
    YY-MM-DD
    YY/MM/DD
    YY MM DD
    MM.DD
    MM-DD
    MM/DD
    MM DD

    3. time 정규표현식 검증
    HH:mm:ss
    HH:mm

	  4. datestr 정규표현식 검증
  	MM DD, YYYY
  	MM DD YYYY
  	MM/DD,/YYYY
  	MM/DD/YYYY
  	MM.DD,.YYYY
  	MM.DD.YYYY
  	MM-DD,-YYYY
  	MM-DD-YYYY
  	DD MM YYYY
  	DD/MM/YYYY
  	DD-MM-YYYY
  	DD.MM.YYYY

    october 10, 2017

    4. date 객체의 toString 값으로 리턴
  **/

  var datetime = null;
  var now = new Date();
  var year = null;
  var month = null;
  var date = null;
  var hours = 0;
  var minutes = 0;
  var seconds = 0;

  var regxResult = regxs.datetime.exec(datetimeTxt);
  if (regxResult !== null) {
    if (regxResult[1] !== undefined && regxResult[2] !== undefined) {
      var amount = parseInt(regxResult[1]);
      var dhmsType = regxResult[2];

      year = now.getFullYear();
      month = now.getMonth();

      // 시간 연산
      if (dhmsType === "일" || dhmsType === "d") {
        date = now.getDate() - amount;
      } else if (dhmsType === "시간" || dhmsType === "h") {
        date = now.getDate();
        hours = now.getHours() - amount;
      } else if (dhmsType === "분" || dhmsType === "m") {
        date = now.getDate();
        hours = now.getHours();
        minutes = now.getMinutes() - amount;
      } else if (dhmsType === "초" || dhmsType === "s") {
        date = now.getDate();
        hours = now.getHours();
        minutes = now.getMinutes();
        seconds = now.getSeconds() - amount;
      } else if (dhmsType === "주" || dhmsType === "w") {
        date = now.getDate() - 7 * amount;
      } else if (dhmsType === "달" || dhmsType === "개월" || dhmsType === "M") {
        date = now.getDate();
        month = now.getMonth() - amount;
        day = now.getDate();
      } else if (dhmsType === "년" || dhmsType === "y") {
        date = now.getDate();
        year = now.getFullYear() - amount;
      }
    }
  } else {
    regxResult = regxs.date.exec(datetimeTxt);
    if (regxResult !== null) {
      if (
        regxResult[1] !== undefined &&
        regxResult[2] !== undefined &&
        regxResult[3] !== undefined
      ) {
        if (regxResult[1].length === 4) {
          year = parseInt(regxResult[1]);
        } else if (regxResult[1].length === 2) {
          if (
            regxResult[1].charAt(0) === "0" ||
            regxResult[1].charAt(0) === "1" ||
            regxResult[1].charAt(0) === "2"
          ) {
            year = parseInt("20" + regxResult[1]);
          } else {
            year = parseInt("19" + regxResult[1]);
          }
        }

        month = parseInt(regxResult[2]) - 1;
        date = parseInt(regxResult[3]);
      } else if (regxResult[1] !== undefined && regxResult[2] !== undefined) {
        if (regxResult[1].length === 4) {
          year = parseInt(regxResult[1]);
        } else if (regxResult[1].length === 2) {
          if (
            regxResult[1].charAt(0) === "0" ||
            regxResult[1].charAt(0) === "1" ||
            regxResult[1].charAt(0) === "2"
          ) {
            year = parseInt("20" + regxResult[1]);
          } else {
            year = parseInt("19" + regxResult[1]);
          }
        }

        //month = parseInt(regxResult[2]) - 1;
        month = parseInt(regxResult[2]);
        date = 0;
      } else if (regxResult[4] !== undefined && regxResult[5] !== undefined) {
        year = now.getFullYear();
        month = parseInt(regxResult[4]) - 1;
        date = parseInt(regxResult[5]);
      } else if (
        regxResult[6] !== undefined &&
        regxResult[7] !== undefined &&
        regxResult[8] !== undefined
      ) {
        year = parseInt(regxResult[6]);
        month = parseInt(regxResult[7]) - 1;
        date = parseInt(regxResult[8]);
      } else if (
        regxResult[9] !== undefined &&
        regxResult[10] !== undefined &&
        regxResult[11] !== undefined
      ) {
        if (
          regxResult[9].charAt(0) === "0" ||
          regxResult[9].charAt(0) === "1" ||
          regxResult[9].charAt(0) === "2"
        ) {
          year = parseInt("20" + regxResult[9]);
        } else {
          year = parseInt("19" + regxResult[9]);
        }

        month = parseInt(regxResult[10]);
        date = parseInt(regxResult[11]);
      }

      regxResult = regxs.time.exec(datetimeTxt);
      if (regxResult !== null) {
        if (regxResult[1] !== undefined && regxResult[2] !== undefined) {
          hours = parseInt(regxResult[1]);
          minutes = parseInt(regxResult[2]);
          if (regxResult[3] !== undefined) {
            seconds = parseInt(regxResult[3]);
          }
        }
      }
    } else {
      regxResult = regxs.time.exec(datetimeTxt);
      if (regxResult !== null) {
        if (regxResult[1] !== undefined && regxResult[2] !== undefined) {
          if (year === null) {
            year = now.getFullYear();
          }
          if (month === null) {
            month = now.getMonth();
          }
          if (date === null) {
            date = now.getDate();
          }
          hours = parseInt(regxResult[1]);
          minutes = parseInt(regxResult[2]);
          if (regxResult[3] !== undefined) {
            seconds = parseInt(regxResult[3]);
          }
        }
      } else {
        regxResult = regxs.datestr.exec(datetimeTxt);
        if (regxResult !== null) {
          if (
            regxResult[1] !== undefined &&
            regxResult[2] !== undefined &&
            regxResult[3] !== undefined
          ) {
            if (regxResult[3].length === 4) {
              // YYYY
              year = parseInt(regxResult[3]);
            } else if (regxResult[3].length === 2) {
              // YY
              if (
                regxResult[3].charAt(0) === "0" ||
                regxResult[3].charAt(0) === "1" ||
                regxResult[3].charAt(0) === "2"
              ) {
                year = parseInt("20" + regxResult[3]);
              } else {
                year = parseInt("19" + regxResult[3]);
              }
            }
            month = __parseMonth(regxResult[1]);
            date = parseInt(regxResult[2]);
          } else if (
            regxResult[4] !== undefined &&
            regxResult[5] !== undefined &&
            regxResult[6] !== undefined
          ) {
            if (regxResult[6].length === 4) {
              // YYYY
              year = parseInt(regxResult[6]);
            } else if (regxResult[6].length === 2) {
              // YY
              if (
                regxResult[6].charAt(0) === "0" ||
                regxResult[6].charAt(0) === "1" ||
                regxResult[6].charAt(0) === "2"
              ) {
                year = parseInt("20" + regxResult[6]);
              } else {
                year = parseInt("19" + regxResult[6]);
              }
            }
            month = __parseMonth(regxResult[5]);
            date = parseInt(regxResult[4]);
          } else if (
            regxResult[7] !== undefined &&
            regxResult[8] !== undefined
          ) {
            if (regxResult[8].length === 4) {
              // YYYY
              year = parseInt(regxResult[8]);
            } else if (regxResult[8].length === 2) {
              //YY
              if (
                regxResult[3].charAt(0) === "0" ||
                regxResult[3].charAt(0) === "1" ||
                regxResult[3].charAt(0) === "2"
              ) {
                year = parseInt("20" + regxResult[3]);
              } else {
                year = parseInt("19" + regxResult[3]);
              }
            }
            month = __parseMonth(regxResult[7]);
          }
        }
      }
    }
  }

  datetime = new Date(year, month, date, hours, minutes, seconds);

  return datetime.toString();
} // __parseDatetime

/**
 * 영문 월 파싱
 * @param       {string} name 월
 */
function __parseMonth(name) {
  var monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december"
  ];
  /*
    var monthShortNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", ",Sep", "Oct", "Nov", "Dec"
    ];
    */

  if (monthNames.indexOf(name.toLowerCase()) > -1) {
    return monthNames.indexOf(name.toLowerCase());
  }

  for (var idx = 0; idx < monthNames.length; idx++) {
    if (name.length === 3) {
      if (name.toLowerCase() === monthNames[idx].substr(0, 3)) {
        return idx;
      }
    } else {
      if (name.toLowerCase() === monthNames[idx]) {
        return idx;
      }
    }
  }

  return 0;
} // __parseMonth

if (exports) {
  module.exports = __parseDatetime;
}
