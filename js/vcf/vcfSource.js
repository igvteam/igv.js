// Define a feature source that reads from non-indexed bed files

var igv = (function (igv) {


    igv.VCFSource = function (config) {

        this.url = config.url;

    };


    igv.VCFSource.prototype.loadFeatures = function (continuation, task) {

        var myself = this;

        var dataLoader = new igv.DataLoader(this.url);

        dataLoader.loadBinaryString(function (data) {

                decodeFeatures.call(myself, data, continuation);
            },
            task);

    };


    decodeFeatures = function (data, continuation) {

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
            if (line.startsWith("##")) {
            }
            else if (line.startsWith("#")) {
            }
            else {
                tokens = lines[i].split("\t");
                variant = decode(tokens);
                if (variant != null) {
                    allFeatures.push(decode(tokens));
                }

            }
        }

        continuation(allFeatures);


        function decode(tokens) {

            var variant;

            if (tokens.length < 8) return null;

            variant = {

                chr: tokens[0], // TODO -- use genome aliases

                pos: parseInt(tokens[1]) - 1,

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

    };

    return igv;
})(igv || {});
