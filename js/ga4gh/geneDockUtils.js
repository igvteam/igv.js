var igv = (function (igv) {
    function _calcSignature(secret, text) {
        return CryptoJS.HmacSHA1(text, secret).toString(CryptoJS.enc.Base64);
    }

    function _calcMD5(data) {
        return CryptoJS.MD5(data).toString(CryptoJS.enc.Base64);
    }

    igv.GeneDock = {
        addGeneDockHeaders: function (url, options) {
            query = options.sendData || options.body;

            method = options.method || (query ? "POST" : "GET");
            headers = options.headers || {};

            headers["Cache-Control"] = "no-cache";

            dateString = new Date().toUTCString();

            contentMD5 = CryptoJS.MD5(query).toString(CryptoJS.enc.Base64);

            resource = url.replace(BASE_ADDRESS, '');
            
            contentType = 'application/json; charset=UTF-8';

            stringToSign = method+'\n'+ contentMD5+'\n'+
                            contentType +'\n'+dateString+'\n'+'x-gd-date:'+ 
                            dateString+'\n'+resource;

            signature = CryptoJS.HmacSHA1(stringToSign, window.ACCESS_KEY_SECRET).toString(CryptoJS.enc.Base64);;

            auth = 'GeneDock '+window.ACCESS_KEY_ID+':'+signature;
            
            headers['authorization'] = auth;
            headers['x-gd-date'] = dateString;
            headers['content-md5'] = contentMD5;
            // headers['content-type'] = contentType;
            // 将igvxhr中的contentType设置改为：
            // if (contentType) {
            //     xhr.setRequestHeader("Content-Type", contentType);
            // }

            return headers;
        }
    }

    return igv;

})(igv || {});