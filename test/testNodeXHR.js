import ignore from "./util/setup.js";
import igvxhr from "../js/igvxhr.js";

igvxhr.loadString("https://example.com")
    .then(function (str) {
        console.log(str);
    })

