export function keepTrackOfReviews() {
  let reviews = JSON.parse(localStorage.getItem('reviews'));
  let firstTimeToday = !JSON.parse(localStorage.getItem('first-time-today'));
  if (firstTimeToday) {
    localStorage.setItem('first-time-today', JSON.stringify(Date.now()));
    localStorage.setItem('reviews-1day-ago', JSON.stringify(reviews));
  }

  let thisWeek = moment(moment(), 'MMDDYYYY').isoWeek();
  let firstTimeThisWeek =
    JSON.parse(localStorage.getItem('first-time-this-week')) !== thisWeek;
  if (firstTimeThisWeek) {
    localStorage.setItem('first-time-this-week', JSON.stringify(thisWeek));
    localStorage.setItem('reviews-1week-ago', JSON.stringify(reviews));
  }
}
