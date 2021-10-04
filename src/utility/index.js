import { categorySeparator } from '../player/playlist.js';

export function sortReviews(reviews, sortCriteria) {
  const MINIMUM_REVIEW_COUNT = 3;
  let temp = [];

  let result = Object.keys(reviews)
    .map((key) => reviews[key])
    .map((review) => {
      let updatedReview = Object.keys(review.replayHistory).map((key) => ({
        //  [key]: review.replayHistory[key],
        replayCount: review.replayHistory[key].count,
        startTime: review.replayHistory[key].startTime,
        endTime: review.replayHistory[key].endTime,
        split: key,
      }));
      return updatedReview.map((split) => {
        return { ...review, ...split };
      });
    })
    .flat()
    .filter((review) => review.replayCount >= MINIMUM_REVIEW_COUNT);

  switch (sortCriteria) {
    case 'count-descending': {
      result = result.sort((reviewA, reviewB) => reviewB.replayCount - reviewA.replayCount);
      temp = result.map(({ replayCount, name }) => ({ replayCount, name }));
      break;
    }
    case 'count-ascending': {
      result = result.sort((reviewA, reviewB) => reviewA.replayCount - reviewB.replayCount);
      temp = result.map(({ replayCount, name }) => ({ replayCount, name }));
      break;
    }
    case 'same-folder': {
      result = result.sort((reviewA, reviewB) => reviewA.path.localeCompare(reviewB.path));
      result = groupReviewsBy({
        reviews: result,
        innerKey: 'path',
        partitionFunc: getFileDirectory,
        finalSortFunc: (reviews) =>
          reviews.sort((reviewA, reviewB) => reviewA.path.localeCompare(reviewB.path)),
      });

      temp = result.map(({ path, name }) => ({ path, name }));
      break;
    }
    case 'same-parent-folder': {
      result = result.sort((reviewA, reviewB) => reviewA.path.localeCompare(reviewB.path));
      result = groupReviewsBy({
        reviews: result,
        innerKey: 'path',
        partitionFunc: getFileParentDirectory,
        finalSortFunc: (reviews) =>
          reviews.sort((reviewA, reviewB) => reviewA.path.localeCompare(reviewB.path)),
      });

      temp = result.map(({ path, name }) => ({ path, name }));
      break;
    }
    case 'time-descending': {
      result = result.sort(
        (reviewA, reviewB) => reviewA.lastReviewDate - reviewB.lastReviewDate
      );
      result = groupReviewsBy({
        reviews: result,
        innerKey: 'lastReviewDate',
        partitionFunc: dateToDescription,
        finalSortFunc: (reviews) =>
          reviews.sort((reviewA, reviewB) => reviewA.lastReviewDate - reviewB.lastReviewDate),
      });
      temp = result.map(({ lastReviewDate, name }) => ({
        time: dateToDescription(lastReviewDate),
        lastReviewDate,
        name,
      }));
      break;
    }
    case 'time-ascending': {
      result = result.sort(
        (reviewA, reviewB) => reviewB.lastReviewDate - reviewA.lastReviewDate
      );
      result = groupReviewsBy({
        reviews: result,
        innerKey: 'lastReviewDate',
        partitionFunc: dateToDescription,
        finalSortFunc: (reviews) =>
          reviews.sort((reviewA, reviewB) => reviewB.lastReviewDate - reviewA.lastReviewDate),
      });
      temp = result.map(({ lastReviewDate, name }) => ({
        time: dateToDescription(lastReviewDate),
        lastReviewDate,
        name,
      }));
      break;
    }
    default: {
      result = result.sort((reviewA, reviewB) => reviewB.replayCount - reviewA.replayCount);
      temp = result.map(({ replayCount, name }) => ({ replayCount, name }));
    }
  }
  //   console.error('🚀 sortReviews ~ temp', temp);
  return result;
}

export function groupReviewsBy({ reviews, innerKey, partitionFunc, finalSortFunc }) {
  let result = [];
  const resultMap = {};
  for (let item of reviews) {
    let partitionKey = partitionFunc(item[innerKey]);
    if (resultMap[partitionKey]?.length) {
      resultMap[partitionKey].push(item);
    } else {
      resultMap[partitionKey] = [];
      resultMap[partitionKey].push(item);
    }
  }

  for (let item in resultMap) {
    let sortedItems = finalSortFunc(resultMap[item]);

    result = [
      ...result,
      {
        ...categorySeparator,
        name: partitionFunc(sortedItems[sortedItems.length - 1][innerKey]),
      },
      ...sortedItems,
    ];
  }
  return result;
  //     result = result.length
  //       ? [
  //           ...result,
  //           { ...categorySeparator, name: partitionFunc(result[result.length - 1][innerKey]) },
  //           ...sortedItems,
  //         ]
  //       : [...sortedItems];
  //   }
  //   return result;
}

export function dateToDescription(myDate) {
  let now = moment(),
    days = now.diff(myDate, 'days'),
    weeks = now.diff(myDate, 'weeks'),
    result = '';

  if (parseInt(days) === 0) {
    result = 'Today';
  } else if (parseInt(days) > 0 && parseInt(days) < 7) {
    result = `${days} ${days > 1 ? 'days ago' : 'day ago'}`;
  }
  //   else if (parseInt(weeks) === 0) {
  //     result = 'This week';
  //   }
  else if (parseInt(weeks) > 0 && parseInt(weeks) < 4) {
    result = `${weeks} ${weeks > 1 ? 'weeks ago' : 'week ago'}`;
  } else {
    result = moment(myDate).fromNow();
  }
  return result;
}

export function getFileDirectory(filePath) {
  if (filePath.indexOf('/') == -1) {
    // windows
    return filePath.substring(0, filePath.lastIndexOf('\\'));
  } else {
    // unix
    return filePath.substring(0, filePath.lastIndexOf('/'));
  }
}

export function getFileParentDirectory(path) {
  let filePath = getFileDirectory(path);
  if (filePath.indexOf('/') == -1) {
    // windows
    return filePath.substring(0, filePath.lastIndexOf('\\'));
  } else {
    // unix
    return filePath.substring(0, filePath.lastIndexOf('/'));
  }
}
