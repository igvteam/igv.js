var igv = (function (igv) {


    igv.Ga4ghReader = function (url, readsetId, proxy) {

        this.url = url;
        this.readsetId = readsetId;
        this.proxy = proxy;

    }

    igv.Ga4ghReader.prototype.readAlignments = function (chr, start, end, success, task) {

        var window = Math.max(bpEnd - bpStart, 10000000) / 2,
            center = (bpEnd + bpStart) / 2,
            queryChr = (chr.startsWith("chr") ? chr.substring(3) : chr),
            queryStart = Math.max(0, center - window),
            queryEnd = center + window,
            dataLoader = new igv.DataLoader(this.proxy ? this.proxy : this.url);


        var body = {"readsetIds": [this.readsetId], "sequenceName": queryChr, "sequenceStart": queryStart, "sequenceEnd": queryEnd, "maxResults": "10000"},
            tmp = this.proxy ?
                "url=" + this.url + "&data=" + JSON.stringify(data) :
                JSON.stringify(data);

        dataLoader.postJson(tmp, function (result) {

                if (result) {

                    var jsonRecords = JSON.parse(result).variants,
                        alignments = igv.decodeGa4ghReads(jsonRecords);
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