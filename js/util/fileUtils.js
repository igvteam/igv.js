/**
 * Return the filename from the path.   Example
 *   https://foo.com/bar.bed?param=2   => bar.bed
 * @param path
 */
function getFilename (path) {

    var index, filename;

    if (path instanceof File) {
        return path.name;
    }
    else {
        index = path.lastIndexOf("/");
        filename = index < 0 ? path : path.substr(index + 1);

        //Strip parameters -- handle local files later
        index = filename.indexOf("?");
        if (index > 0) {
            filename = filename.substr(0, index);
        }
        return filename;
    }
}

function isFilePath (path) {
    return (path instanceof File);
}

export {getFilename, isFilePath}
