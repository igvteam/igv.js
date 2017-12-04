var igv = (function (igv) {
    igv.Azure = {
        proxyDomainName: '',

        isAzureURL: function (url) {
            return url.contains("azure");
        },

        addQueryParams: function (url, startChunk, endChunk) {
            if (url.contains('azure')) {
                var symbol = (url.contains('?')) ? '&' : '?';
                url = url + symbol + 'startChunk=' + startChunk + '&endChunk=' + endChunk;
            }

            return url;
        }
    }

    return igv;

})(igv || {});
