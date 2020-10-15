
/**
 * Decode a custom columnar format.  Required columns are 'chr' and 'start'
 *
 * @param tokens
 * @param ignore
 * @returns decoded feature, or null if this is not a valid record
 */
function decodeCustom(tokens, header) {

    if (tokens.length < header.format.fields.length) return undefined;

    const format = header.format;         // "this" refers to FeatureParser instance
    const coords = format.coords || 0;

    const chr = tokens[format.chr];
    const start = parseInt(tokens[format.start]) - coords;
    const end = format.end !== undefined ? parseInt(tokens[format.end]) : start + 1;

    const feature = {chr: chr, start: start, end: end};

    if (format.fields) {
        format.fields.forEach(function (field, index) {

            if (index !== format.chr &&
                index !== format.start &&
                index !== format.end) {

                feature[field] = tokens[index];
            }
        });
    }

    return feature;

}


// function expandFormat(format) {
//     const fields = format.fields;
//     const keys = ['chr', 'start', 'end'];
//     for (let i = 0; i < fields.length; i++) {
//         for (let key of keys) {
//             if (key === fields[i]) {
//                 format[key] = i;
//             }
//         }
//     }
//     return format;
// }

export {decodeCustom}