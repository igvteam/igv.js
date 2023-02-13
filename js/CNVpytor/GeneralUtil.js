
function range_function(start, stop, step) {
  const data_array = Array(Math.ceil((stop - start) / step))
    .fill(start)
    .map((x, y) => x + y * step);
  return data_array;
}

function Gaussian([a, x0, sigma]) {
  return x =>
    (a * Math.exp(-Math.pow(x - x0, 2) / (2 * Math.pow(sigma, 2)))) / (Math.sqrt(2 * Math.PI) * sigma);
}

function filterOutliers(someArray) {

  if (someArray.length < 4)
    return someArray;

  let values, q1, q3, iqr, maxValue, minValue;

  values = someArray.slice().sort((a, b) => a - b); //copy array fast and sort

  if ((values.length / 4) % 1 === 0) { //find quartiles
    q1 = 1 / 2 * (values[(values.length / 4)] + values[(values.length / 4) + 1]);
    q3 = 1 / 2 * (values[(values.length * (3 / 4))] + values[(values.length * (3 / 4)) + 1]);
  } else {
    q1 = values[Math.floor(values.length / 4 + 1)];
    q3 = values[Math.ceil(values.length * (3 / 4) + 1)];
  }

  iqr = q3 - q1;
  maxValue = q3 + iqr * 1.5;
  minValue = q1 - iqr * 1.5;

  return values.filter((x) => (x >= minValue) && (x <= maxValue));
}

function getDistParams(bins) {
  let filteredBins = filterOutliers(bins)
  const n = filteredBins.length
  const mean = filteredBins.reduce((a, b) => a + b) / n
  const std = Math.sqrt(filteredBins.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
  return [mean, std]
}

export { range_function, getDistParams };
