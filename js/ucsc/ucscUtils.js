

function convertToHubURL(accension) {
    //https://hgdownload.soe.ucsc.edu/hubs/GCF/016/808/095/GCF_016808095.1/
    //https://hgdownload.soe.ucsc.edu/hubs/GCA/028/534/965/GCA_028534965.1/
    if (accension.startsWith("GCF") || accension.startsWith("GCA") && accension.length >= 13) {
        const prefix = accension.substring(0, 3);
        const n1 = accension.substring(4, 7);
        const n2 = accension.substring(7, 10);
        const n3 = accension.substring(10, 13);
        return "https://hgdownload.soe.ucsc.edu/hubs/" + prefix + "/" + n1 + "/" + n2 + "/" + n3 + "/" + accension + "/hub.txt";
    } else {
        return undefined;
    }
}

export {convertToHubURL}