const path = "bambaifiles/"; //I don't know if this path is correct
const options = {
  // showIdeogram: false,
  //locus: "Untitled Sequence||17595|linear", //what should go here?
  reference: {
    id: "testing",
    fastaURL: path + "x.fasta",
    //indexURL: path + "x.fasta.fai"
    indexed: false
  },
  tracks: [
    {
      name: "Alignment",
      url: path + "x.bam",
      indexURL: path + "x.bai",
      displayMode: "EXPANDED"
    }
  ]
};
const browser = window.igv.createBrowser(
  document.getElementById("app"),
  options
);
console.log("browser:", browser);
