import getDataWrapper from "../feature/dataWrapper.js";

class GCNVParser {
  parseFeatures(data) {
    if (!data) return null;

    console.warn('Parse features')
    const sampleNames = this.parseHeader(data);

    const dataWrapper = getDataWrapper(data);

    let line;
    let i = 0;
    const allFeatures = [];
    while (line = dataWrapper.nextLine()) {
      i += 1;
      let tokens = line.split("\t");

      const chr = tokens[0];
      const start = parseInt(tokens[1]);
      const end = parseInt(tokens[2]);
      const values = tokens.slice(3).map(parseFloat);

      if (values.length == sampleNames.length) {
        allFeatures.push({
          chr: chr,
          start: start,
          end: end,
          values: values,
        })
      }
    }

    console.warn('Parsed', allFeatures.length, 'features from', sampleNames.length, 'samples')
    return allFeatures
  }

  parseHeader(data) {
    const dataWrapper = getDataWrapper(data);

    const sampleNames = dataWrapper.nextLine().split("\t").slice(3);

    return sampleNames;
  }
}

export default GCNVParser

