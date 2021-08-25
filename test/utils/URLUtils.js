require('btoa');
import fs from 'fs';

async function fileToDataURL(file) {
    const foo = fs.readFileSync(file);
    return "data:application/octet-stream;base64," + foo.toString('base64')
}

// const f = require.resolve("../data/bb/interactExample3.inter.bb");
// fileToDataURL(f)
//     .then(function (r) {
//         console.log(r);
//     })
//

export {fileToDataURL}
