/**
 * Utilities for loading encode files
 *
 * Created by jrobinso on 3/19/14.
 */

var encode = (function (encode) {

    var antibodyColors = {H3K27AC: "rgb(200, 0, 0)",
        H3K27ME3: "rgb(130, 0, 4)",
        H3K36ME3: "rgb(0, 0, 150)",
        H3K4ME1: "rgb(0, 150, 0)",
        H3K4ME2: "rgb(0, 150, 0)",
        H3K4ME3: "rgb(0, 150, 0)",
        H3K9AC: "rgb(100, 0, 0)",
        H3K9ME1: "rgb(100, 0, 0)"};

    /**
     *       path    cell    dataType        antibody        view    replicate       type    lab     hub
     * @param file
     * @param continuation
     */

    parseEncodeTableFile = function (file, continuation) {

        var dataLoader = new igv.DataLoader(file);

        dataLoader.loadBinaryString(function (data) {

            var lines = data.split("\n"),
                dataSet = [ ],
                path;

            // Raw data items arrive in this order:
            //
            // path    cell    dataType        antibody        view    replicate       type    lab     hub
            //
            // Reorder to match desired DataTables order in encode.dataTableRowLabels. Discard hub item.
            //
            encode.dataTableRowLabels = lines[0].split("\t");
            encode.dataTableRowLabels.pop();
            path = encode.dataTableRowLabels.shift();
            encode.dataTableRowLabels.push(path);

            lines.slice(1, lines.length - 1).forEach(function (line) {

                var tokens,
                    row = [ ],
                    record = { };

                tokens = line.split("\t");
                tokens.pop();
                path = tokens.shift();
                tokens.push(path);

                tokens.forEach(function (token, index, tks) {

                    row.push( (undefined === token || "" === token) ? "-" : token );

                });

                dataSet.push(row);

            });

            continuation(dataSet);
        });

    };

    encode.createEncodeDataTablesDataSet = function (file, continuation) {

        parseEncodeTableFile(file, function (dataSet) {

            if (continuation) {
//                continuation(dataSet);
                continuation(dataSet);
            }


        });

    };

    encode.encodeTrackLabel = function (record) {

        return (record.antibody) ? record.antibody + " " + record.cell + " " + record.replicate : record.cell + record.dataType + " " + record.view + " " + record.replicate;

    };

    encode.encodeAntibodyColor = function (antibody) {

        var key;

        if (!antibody || "" === antibody) {
            return cursor.defaultColor();
        }

        key = antibody.toUpperCase();
        return (antibodyColors[ key ]) ? antibodyColors[ key ] : cursor.defaultColor();

    };

    return encode;

})(encode || {});
