var igv = (function (igv) {

    igv.ucsc = (igv.ucsc || {});

    igv.ucsc.parseTrackLine = function (line) {

        var properties = {},
            tokens = line.split(/(?:")([^"]+)(?:")|([^\s"]+)(?=\s+|$)/g),
            tmp = [],
            i, tk, curr;

        // Clean up tokens array
        for(i=1; i<tokens.length; i++) {
            if(!tokens[i] || tokens[i].trim().length === 0) continue;

            tk = tokens[i].trim();

            if(tk.endsWith("=") > 0) {
                curr = tk;
            }
            else if(curr) {
                tmp.push(curr + tk);
                curr = undefined;
            }
            else {
                tmp.push(tk);
            }

        }


        tmp.forEach(function (str) {
            if(!str) return;
            var kv = str.split('=', 2);
            if (kv.length == 2) {
                properties[kv[0]] = kv[1];
            }

        });

        return properties;

    }


    return igv;
})
(igv || {});
