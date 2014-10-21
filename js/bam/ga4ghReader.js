var igv = (function (igv) {


    igv.Ga4ghReader = function (url, readsetId, authKey, proxy) {

        this.url = url;
        this.readsetId = readsetId;
        this.authKey = authKey;
        this.proxy = proxy;

    }

    igv.Ga4ghReader.prototype.readAlignments = function (chr, bpStart, bpEnd, success, task) {

        var dataLoader,
            queryChr = (chr.startsWith("chr") ? chr.substring(3) : chr),
            readURL,
            body = {"readsetIds": [this.readsetId], "sequenceName": queryChr, "sequenceStart": bpStart, "sequenceEnd": bpEnd, "maxResults": "10000"},
            tmp;

        readURL = this.url + "/reads/search";
        if(this.authKey) {
            readURL = readURL + "?key=" + this.authKey;
        }

        dataLoader = new igv.DataLoader(this.proxy ? this.proxy : readURL);

        tmp = this.proxy ?
            "url=" + readURL + "&data=" + JSON.stringify(body) :
            JSON.stringify(body);

        dataLoader.postJson(tmp, function (result) {

                if (result) {
                    // TODO -- deal with nextPageToken

                    var jsonRecords = JSON.parse(result),
                        alignments = igv.decodeGa4ghReads(jsonRecords.reads);
                    success(alignments);

                }
                else {
                    success(null);
                }

            },
            task);


    }


    return igv;

})(igv || {});