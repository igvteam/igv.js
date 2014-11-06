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

        igvxhr.loadJson(sendURL,
            {
                sendData: sendData,
                task: task,
                contentType: "application/json",
                success: function (json) {

                    if (json) {
                        // TODO -- deal with nextPageToken
                        success(igv.decodeGa4ghReads(json.reads));
                    }
                    else {
                        success(null);
                    }

                }
            });


    }


    return igv;

})(igv || {});