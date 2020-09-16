// Emulate the browser XMLHttpRequest object for local files using the Node file system
// url will be a relative file path
// supports 'GET' only
// support range header, responseType

xhr.open(method, url);
    xhr.setRequestHeader("Range", "bytes=" + range.start + "-" + rangeEnd);
    //      xhr.setRequestHeader("Cache-Control", "no-cache");    <= This can cause CORS issues, disabled for now

    xhr.setRequestHeader("Content-Type", contentType);

    xhr.overrideMimeType(mimeType);

    xhr.responseType = responseType;

        xhr.setRequestHeader(key, value);

    xhr.withCredentials = true;

xhr.onload = async function (event) {
xhr.status
    xhr.response.length > 100000 && !RANGE_WARNING_GIVEN) {
xhr.response.slice(range.start, range.start + range.size));
xhr.response
xhr.onerror = function (event) {
xhr.ontimeout = function (event) {
xhr.onabort = function (event) {
xhr.send(sendData);