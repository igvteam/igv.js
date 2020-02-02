import getDataWrapper from "../feature/dataWrapper.js";
import {splitLines} from "../util/stringUtils.js";

class GCNVParser {
  parseFeatures(data) {
    if (!data) return null;

    const dataWrapper = getDataWrapper(data);

    // Read locus
    const sampleNames = this.parseHeader(dataWrapper.nextLine());
    const allFeatures = [];

    let i = 0
    let line;
    while (line = dataWrapper.nextLine()) {
      i += 1
      let tokens = line.split("\t");


      const chr = tokens[0];
      const start = parseInt(tokens[1]);
      const end = parseInt(tokens[2]);


      const values = tokens.slice(3).map(function (v, j) {
        v = parseFloat(v)
        return [sampleNames[j], v]
      });

      allFeatures.push({
        chr: chr,
        start: start,
        end: end,
        values: values,
      })

      if (i == 1) {
        console.warn(values);
      }
      /*
      for (let j = 0; j < sampleNames.length; j++) {

        if (tokens.length > j) {
          const sampleName = sampleNames[j];
          const value = parseFloat(tokens[j]);
          allFeatures.push({
            sampleKey: sampleName,
            sample: sampleName,
            chr: chr,
            start: start,
            end: end,
            value: value
          });
        }
      }
      */
    }

    console.warn('Parsed', allFeatures.length, ' gcnv rows')

    return allFeatures
  }

  parseHeader(line) {
    const tokens = line.split("\t");

    return tokens.slice(3)
  }
}

export default GCNVParser

