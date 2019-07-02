import {
  __addDays,
  __MONTH_DAYS_LEAP,
  __MONTH_DAYS_REGULAR,
} from './__addDays';
import {
  __arraySum,
} from './__arraySum';
import {
  __isLeapYear,
} from './__isLeapYear';
import {
  getHeap,
} from './heaps/heaps';
import {
  intArrayFromString,
} from './emscripten/intArrayFromString';
import {
  pointerStringify,
} from './pointers/pointerStringify';
import {
  assertValid,
} from 'ts-assertions';
import {
  writeArrayToMemory,
} from './heaps/writeArrayToMemory';

const HEAP32 = getHeap('HEAP32');

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function _strftime(s: Buffer, maxsize: number, format: number, tm: number) {
  let tm_zone = HEAP32[tm + 40 >> 2];
  const date = {
    tm_sec: HEAP32[tm >> 2],
    tm_min: HEAP32[tm + 4 >> 2],
    tm_hour: HEAP32[tm + 8 >> 2],
    tm_mday: HEAP32[tm + 12 >> 2],
    tm_mon: HEAP32[tm + 16 >> 2],
    tm_year: HEAP32[tm + 20 >> 2],
    tm_wday: HEAP32[tm + 24 >> 2],
    tm_yday: HEAP32[tm + 28 >> 2],
    tm_isdst: HEAP32[tm + 32 >> 2],
    tm_gmtoff: HEAP32[tm + 36 >> 2],
    tm_zone: tm_zone ? pointerStringify(tm_zone) : '',
  };

  let pattern = assertValid<string>(pointerStringify(format));
  const EXPANSION_RULES_1: Record<string, string> = {
    '%c': '%a %b %d %H:%M:%S %Y',
    '%D': '%m/%d/%y',
    '%F': '%Y-%m-%d',
    '%h': '%b',
    '%r': '%I:%M:%S %p',
    '%R': '%H:%M',
    '%T': '%H:%M:%S',
    '%x': '%m/%d/%y',
    '%X': '%H:%M:%S',
  };

  for (let rule in EXPANSION_RULES_1) {
    pattern = pattern.replace(new RegExp(rule,'g'), EXPANSION_RULES_1[rule]);
  }

  function leadingSomething(value: any, digits: number, character: string) {
    let str = typeof value === 'number' ? value.toString() : value || '';
    while (str.length < digits) {
      str = character[0] + str;
    }

    return str;
  }

  function leadingNulls(value: any, digits: number) {
    return leadingSomething(value, digits, '0');
  }

  function compareByDay(date1: Date, date2: Date) {
    function sgn(value: number) {
      return value < 0 ? -1 : value > 0 ? 1 : 0;
    }

    let compare;
    if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
      if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
        compare = sgn(date1.getDate() - date2.getDate());
      }
    }

    return compare;
  }

  function getFirstWeekStartDate(janFourth: Date) {
    const j4day = janFourth.getDay();
    if (j4day === 0) {
      return new Date(janFourth.getFullYear() - 1, 11, 29);
    } else if (j4day === 1) {
      return janFourth;
    } else if (j4day === 2) {
      return new Date(janFourth.getFullYear(), 0, 3);
    } else if (j4day === 3) {
      return new Date(janFourth.getFullYear(), 0, 2);
    } else if (j4day === 4) {
      return new Date(janFourth.getFullYear(), 0, 1);
    } else if (j4day === 5) {
      return new Date(janFourth.getFullYear() - 1, 11, 31);
    } else if (j4day === 6) {
      return new Date(janFourth.getFullYear() - 1, 11, 30);
    }

    throw new Error('Day was not valid in _strftime.');
  }

  function getWeekBasedYear(date: any) {
    const thisDate = __addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
    const janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
    const janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
    const firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
    const firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
    if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
      if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
        return thisDate.getFullYear() + 1;
      } else {
        return thisDate.getFullYear();
      }
    } else {
      return thisDate.getFullYear() - 1;
    }
  }

  const EXPANSION_RULES_2: Record<any, any> = {
    '%a': function (date: any) {
      return WEEKDAYS[date.tm_wday].substring(0, 3);
    },

    '%A': function (date: any) {
      return WEEKDAYS[date.tm_wday];
    },

    '%b': function (date: any) {
      return MONTHS[date.tm_mon].substring(0, 3);
    },

    '%B': function(date: any) {
      return MONTHS[date.tm_mon];
    },

    '%C': function(date: any) {
      let year = date.tm_year + 1900;
      return leadingNulls(year / 100 | 0, 2);
    },

    '%d': function(date: any) {
      return leadingNulls(date.tm_mday, 2);
    },

    '%e': function(date: any) {
      return leadingSomething(date.tm_mday, 2, ' ');
    },

    '%g': function (date: any) {
      return getWeekBasedYear(date).toString().substring(2);
    },

    '%G': function (date: any) {
      return getWeekBasedYear(date);
    },

    '%H': function (date: any) {
      return leadingNulls(date.tm_hour, 2);
    },

    '%I': function (date: any) {
      let twelveHour = date.tm_hour;
      if (twelveHour == 0) {
        twelveHour = 12;
      } else if (twelveHour > 12) {
        twelveHour -= 12;
      }

      return leadingNulls(twelveHour, 2);
    },

    '%j': function (date: any) {
      const tm_mday = date.tm_mday;
      const isLeapYear = __isLeapYear(date.tm_year + 1900);
      const new_tm_mon = date.tm_mon - 1;
      const monthDays = isLeapYear ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR;
      const arrSum = __arraySum(monthDays, new_tm_mon);
      const sum = tm_mday + arrSum;
      return leadingNulls(sum, 3);
    },

    '%m': function (date: any) {
      return leadingNulls(date.tm_mon + 1, 2);
    },

    '%M': function (date: any) {
      return leadingNulls(date.tm_min, 2);
    },

    '%n': function () {
      return '\n';
    },

    '%p': function (date: any) {
      if (date.tm_hour >= 0 && date.tm_hour < 12) {
        return 'AM';
      }

      return 'PM';
    },

    '%S': function (date: any) {
      return leadingNulls(date.tm_sec, 2);
    },

    '%t': function () {
      return '\t';
    },

    '%u': function (date: any) {
      const day = new Date(
        date.tm_year + 1900,
        date.tm_mon + 1,
        date.tm_mday,
        0,
        0,
        0,
        0,
      );

      return day.getDay() || 7;
    },

    '%U': function (date: any) {
      let janFirst = new Date(date.tm_year + 1900, 0, 1);
      let firstSunday = janFirst.getDay() === 0 ?
        janFirst :
        __addDays(janFirst, 7 - janFirst.getDay());

      let endDate = new Date(date.tm_year + 1900,date.tm_mon,date.tm_mday);
      if (compareByDay(firstSunday, endDate) < 0) {
        let februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
        let firstSundayUntilEndJanuary = 31 - firstSunday.getDate();
        let days = firstSundayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
        return leadingNulls(Math.ceil(days / 7), 2);
      }

      return compareByDay(firstSunday, janFirst) === 0 ? '01' : '00';
    },

    '%V': function (date: any) {
      let janFourthThisYear = new Date(date.tm_year + 1900,0,4);
      let janFourthNextYear = new Date(date.tm_year + 1901,0,4);
      let firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
      let firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
      let endDate = __addDays(new Date(date.tm_year + 1900,0,1), date.tm_yday);
      if (compareByDay(endDate, firstWeekStartThisYear) < 0) {
        return '53';
      }

      if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {
        return '01';
      }

      let daysDifference;
      if (firstWeekStartThisYear.getFullYear() < date.tm_year + 1900) {
        daysDifference = date.tm_yday + 32 - firstWeekStartThisYear.getDate();
      } else {
        daysDifference = date.tm_yday + 1 - firstWeekStartThisYear.getDate();
      }

      return leadingNulls(Math.ceil(daysDifference / 7), 2);
    },

    '%w': function (date: any) {
      const day = new Date(date.tm_year + 1900, date.tm_mon + 1, date.tm_mday, 0, 0, 0, 0);
      return day.getDay();
    },

    '%W': function (date: any) {
      let janFirst = new Date(date.tm_year, 0, 1);
      let firstMonday = janFirst.getDay() === 1 ?
        janFirst :
        __addDays(
          janFirst,
          janFirst.getDay() === 0 ?
            1 :
            7 - janFirst.getDay() + 1,
        );

      let endDate = new Date(date.tm_year + 1900,date.tm_mon,date.tm_mday);
      if (compareByDay(firstMonday, endDate) < 0) {
        let februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
        let firstMondayUntilEndJanuary = 31 - firstMonday.getDate();
        let days = firstMondayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
        return leadingNulls(Math.ceil(days / 7), 2);
      }

      return compareByDay(firstMonday, janFirst) === 0 ? '01' : '00';
    },

    '%y': function (date: any) {
      return (date.tm_year + 1900).toString().substring(2);
    },

    '%Y': function (date: any) {
      return date.tm_year + 1900;
    },

    '%z': function (date: any) {
      let off = date.tm_gmtoff;
      let ahead = off >= 0;
      off = Math.abs(off) / 60;
      off = off / 60 * 100 + off % 60;
      return (ahead ? '+' : '-') + String('0000' + off).slice(-4);
    },

    '%Z': function (date: any) {
      return date.tm_zone;
    },

    '%%': function () {
      return '%';
    },
  };

  for (let rule in EXPANSION_RULES_2) {
    if (pattern.indexOf(rule) >= 0) {
      pattern = pattern.replace(new RegExp(rule, 'g'), EXPANSION_RULES_2[rule](date));
    }
  }

  let bytes = intArrayFromString(pattern, false);
  if (bytes.length > maxsize) {
    return 0;
  }

  writeArrayToMemory(bytes, s);
  return bytes.length - 1;
}
