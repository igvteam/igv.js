// Define a feature source that reads from non-indexed bed files

var igv = (function (igv) {

    igv.vcfParser = function () {

        return  {

            parseHeader: function (data) {

                var lines = data.split("\n"),
                    len = lines.length,
                    line,
                    i;

                for (i = 0; i < len; i++) {
                    line = lines[i];
                    if (line.startsWith("##")) {

                        if (line.startsWith("track")) {
                            return parseTrackLine(line);
                        }

                    }
                    else {
                        break;
                    }

                }
            },

            parseFeatures: function (data) {

                var lines = data.split("\n"),
                    len = lines.length,
                    tokens,
                    allFeatures,
                    line,
                    i,
                    variant;

                allFeatures = [];
                for (i = 0; i < len; i++) {
                    line = lines[i];
                    if (line.startsWith("#")) {
                        continue;
                    }
                    else {
                        tokens = lines[i].split("\t");
                        variant = decode(tokens);
                        if (variant != null) {
                            allFeatures.push(decode(tokens));
                        }

                    }
                }

                return allFeatures;


                function decode(tokens) {

                    var variant,
                        pos = parseInt(tokens[1]);

                    if (tokens.length < 8) return null;

                    variant = {

                        chr: tokens[0], // TODO -- use genome aliases
                        pos: pos,
                        start: pos - 1,
                        end: pos,
                        id: tokens[2],
                        ref: tokens[3],
                        alt: tokens[4],
                        qual: parseInt(tokens[5]),
                        filter: tokens[6],
                        info: tokens[7]

                        // TODO -- genotype fields

                    };


                    return variant;

                }


            }
        }
    }


    return igv;
})(igv || {});
