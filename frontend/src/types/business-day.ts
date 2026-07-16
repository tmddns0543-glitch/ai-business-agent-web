export type BusinessDate = string;

export interface BusinessDayContext {
  version: 1;
  selectedBusinessDate: BusinessDate;
}

const BUSINESS_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function isValidBusinessDate(
  value: unknown,
): value is BusinessDate {
  if (typeof value !== "string") {
    return false;
  }

  const match = BUSINESS_DATE_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) {
    return false;
  }

  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return day >= 1 && day <= daysInMonth[month - 1];
}

export function formatBusinessDate(date: BusinessDate) {
  const [year, month, day] = date.split("-").map(Number);

  return `${year}년 ${month}월 ${day}일`;
}
