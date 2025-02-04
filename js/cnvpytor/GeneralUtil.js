
class GetFit {
    /**
     * Creates an instance of GetFit.
     * @param {Object} allBins - An object containing all the bins with their respective data.
     */
    constructor(allBins) {
        this.allBins = allBins // Stores all bins data
    }

    /**
     * Extracts bin scores greater than zero from all bins.
     * @returns {Array} An array of bin scores.
     */

    getValues() {
        const bins = Object.values(this.allBins).reduce(
            (binResult, bin) => { return binResult.concat(bin.filter(a => a.binScore > 0).map(a => a.binScore)) }, [])
        return bins
    }

    /**
     * Calculates the mean of the given data.
     * @param {Array} data - The data array to calculate the mean from.
     * @returns {number} The mean value of the data.
     */
    getMean(data) {
        return (data.reduce(function (a, b) { return a + b; }) / data.length);
    }

    fit_data() {
        let rd_list = this.getValues()
        let distParmas = getDistParams(rd_list)
        return distParmas
    }


    histogram(data, bins) {
        const step = bins[1] - bins[0];
        const hist_bins = [];

        data.forEach((value, index) => {
            bins.forEach((bin_value, bin_index) => {
                if (!hist_bins[bin_value]) {
                    hist_bins[bin_value] = { count: 0 };
                }
                if (bin_value <= value && value < bin_value + step) {
                    hist_bins[bin_value].count++;
                    return false;
                }
            });
        });
        const dist_p = []
        hist_bins.forEach((bin, index) => { dist_p.push(bin.count); });
        return dist_p
    }

}


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

function linspace(a, b, n) {
    if (typeof n === "undefined") n = Math.max(Math.round(b - a) + 1, 1);
    if (n < 2) {
        return n === 1 ? [a] : [];
    }
    var ret = Array(n);
    n--;
    for (let i = n; i >= 0; i--) {
        ret[i] = (i * b + (n - i) * a) / n;
    }
    return ret;
}

export function histogram2d(data1, data2, binsX, binsY) {
    // Calculate bin sizes
    const minX = math.min(data1);
    const maxX = math.max(data1);
    const minY = math.min(data2);
    const maxY = math.max(data2);
    const binSizeX = (maxX - minX) / binsX;
    const binSizeY = (maxY - minY) / binsY;
  
    // Create the histogram array
    const histogram = math.zeros(binsX, binsY);
  
    // Populate the histogram
    for (let i = 0; i < data1.length; i++) {
      const xBin = Math.floor((data1[i] - minX) / binSizeX);
      const yBin = Math.floor((data2[i] - minY) / binSizeY);
      histogram.set([xBin, yBin], histogram.get([xBin, yBin]) + 1);
    }
  
    return histogram;
  }

export default { range_function, getDistParams, linspace, GetFit, filterOutliers };
