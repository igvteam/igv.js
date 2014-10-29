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
            sendData,
            sendURL;

        readURL = this.url + "/reads/search";
        if (this.authKey) {
            readURL = readURL + "?key=" + this.authKey;
        }

        sendURL = this.proxy ? this.proxy : readURL;

        sendData = this.proxy ?
            "url=" + readURL + "&data=" + JSON.stringify(body) :
            JSON.stringify(body);

        igvxhr.load(sendURL, {
            method: "POST",
            sendData: sendData,
            task: task,
            contentType: "application/json",
            success: function (result) {

                if (result) {
                    // TODO -- deal with nextPageToken

                    var jsonRecords = JSON.parse(result),
                        alignments = igv.decodeGa4ghReads(jsonRecords.reads);
                    success(alignments);

                }
                else {
                    success(null);
                }

            }
        });


    }


    return igv;

})(igv || {});