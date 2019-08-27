

function getExtension(config) {

    if (undefined === config.url) {
        return undefined;
    }

    let path = isFilePath(config.url) ? config.url.name : config.url;
    let filename = path.toLowerCase();

    //Strip parameters -- handle local files later
    let index = filename.indexOf("?");
    if (index > 0) {
        filename = filename.substr(0, index);
    }

    //Strip aux extensions .gz, .tab, and .txt
    if (filename.endsWith(".gz")) {
        filename = filename.substr(0, filename.length - 3);
    } else if (filename.endsWith(".txt") || filename.endsWith(".tab")) {
        filename = filename.substr(0, filename.length - 4);
    }

    index = filename.lastIndexOf(".");

    return index < 0 ? filename : filename.substr(1 + index);
}

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

export {getExtension, getFilename, isFilePath}
