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

    encode.dataTableRowIndices = { "cell":0, "dataType":1, "antibody":2, "view":3, "replicate":4, "type":5, "lab":6, "path":7 };
    encode.dataTableRowLabels  = [ "cell",   "dataType",   "antibody",   "view",   "replicate",   "type",   "lab",   "path"   ];

    encode.createEncodeDataTablesDataSet = function (file, continuation) {

        var dataSet = [];
        parseEncodeTableFile(file, function (records) {

            records.forEach(function (record) {

                var row = [];
                row.length = encode.dataTableRowLabels.length;

                encode.dataTableRowLabels.forEach(function(field){

                    row[ encode.dataTableRowIndices[ field ] ] = (undefined === record[ field ] || "" === record[ field ]) ? "": record[ field ];

                });

                dataSet.push(row);

            });

            if (continuation) {
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

    /**
     *       path    cell    dataType        antibody        view    replicate       type    lab     hub
     * @param file
     * @param continuation
     */

    parseEncodeTableFile = function (file, continuation) {

        var dataLoader = new igv.DataLoader(file);

        dataLoader.loadBinaryString(function (data) {

            var lines = data.split("\n"),
                records = [ ],
                i,
                len;

            encode.headers = lines[0].split("\t");

            lines.slice(1).forEach(function (line) {

                var tokens = line.split("\t"),
                    record = { };

                for (i = 0, len = tokens.length; i < len; i++) {
                    record[ encode.headers[ i ] ] = tokens[ i ];
                }

                records.push(record);

            });

            continuation(records);
        });

    };

    return encode;

})(encode || {});
