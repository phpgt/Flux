const SECONDS_PER_DAY = 86400;
const MILLISECONDS_PER_DAY = 86400000;

/** Calendar arithmetic uses local date parts, so daylight-saving offsets do not change day counts. */
export function calendarValues(date) {
	let year = date.getFullYear();
	let monthIndex = date.getMonth();
	let day = date.getDate();
	let weekday = (date.getDay() + 6) % 7 + 1;
	let dayScalar = (date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()) / SECONDS_PER_DAY;
	let startOfYear = calendarDay(year, 0, 1);
	let daysInYear = calendarDay(year + 1, 0, 1) - startOfYear;
	let daysInMonth = calendarDay(year, monthIndex + 1, 1) - calendarDay(year, monthIndex, 1);
	return {
		year,
		month: monthIndex + 1,
		day,
		weekday,
		"year-scalar": (calendarDay(year, monthIndex, day) - startOfYear + dayScalar) / daysInYear,
		"month-scalar": (day - 1 + dayScalar) / daysInMonth,
		"week-scalar": (weekday - 1 + dayScalar) / 7,
		"day-scalar": dayScalar,
	};
}

function calendarDay(year, month, day) {
	// setUTCFullYear also handles years 0–99 without Date.UTC's 1900 offset.
	let date = new Date(0);
	date.setUTCFullYear(year, month, day);
	return date.getTime() / MILLISECONDS_PER_DAY;
}

export function timeValues(date) {
	let second = date.getSeconds();
	let minute = date.getMinutes();
	let hour = date.getHours() % 12;
	let secondScalar = second / 60;
	let minuteScalar = (minute + secondScalar) / 60;
	return {
		second,
		minute,
		hour,
		"second-scalar": secondScalar,
		"minute-scalar": minuteScalar,
		"hour-scalar": (hour + minuteScalar) / 12,
	};
}
