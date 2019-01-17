//
//
// class IOFile {
//
//     constructor(source) {
//         this.position = 0
//         this.filename = source
//         this.fd = fsOpen(this.filename, 'r')
//     }
//
//     async read(buffer, offset = 0, length, position) {
//         let readPosition = position
//         if (readPosition === null) {
//             readPosition = this.position
//             this.position += length
//         }
//         return fsRead(await this.fd, buffer, offset, length, position)
//     }
//
//     async readFile() {
//         return fsReadFile(await this.fd)
//     }
//
//     /**
//      * Returns a promise for an objects with file length  {size: <file size>}
//      */
//     async stat() {
//         return {size: undefined}
//     }
// }
//
// module.exports = LocalFile
