/* bptFile - B+ Trees.  These are a method of indexing data similar to binary trees, but
 * with many children rather than just two at each node. They work well when stored on disk,
 * since typically only two or three disk accesses are needed to locate any particular
 * piece of data.  This implementation is *just* for disk based storage.  For memory
 * use the rbTree instead. Currently the implementation is just useful for data warehouse
 * type applications.  That is it implements a function to create a b+ tree from bulk data
 * (bptFileCreate) and a function to lookup a value given a key (bptFileFind) but not functions
 * to add or delete individual items.
 *
 * The layout of the file on disk is:
 *    header
 *    root node
 *    (other nodes)
 * In general when the tree is first built the higher level nodes are stored before the
 * lower level nodes.  It is possible if a b+ tree is dynamically updated for this to
 * no longer be strictly true, but actually currently the b+ tree code here doesn't implement
 * dynamic updates - it just creates a b+ tree from a sorted list.
 *
 * Each node can be one of two types - index or leaf.  The index nodes contain pointers
 * to child nodes.  The leaf nodes contain the actual data.
 *
 * The layout of the file header is:
 *       <magic number>  4 bytes - The value bptSig (0x78CA8C91)
 *       <block size>    4 bytes - Number of children per block (not byte size of block)
 *       <key size>      4 bytes - Number of significant bytes in key
 *       <val size>      4 bytes - Number of bytes in value
 *       <item count>    8 bytes - Number of items in index
 *       <reserved2>     4 bytes - Always 0 for now
 *       <reserved3>     4 bytes - Always 0 for now
 * The magic number may be byte-swapped, in which case all numbers in the file
 * need to be byte-swapped.
 *
 * The nodes start with a header:
 *       <is leaf>       1 byte  - 1 for leaf nodes, 0 for index nodes.
 *       <reserved>      1 byte  - Always 0 for now.
 *       <count>         2 bytes - The number of children/items in node
 * This is followed by count items.  For the index nodes the items are
 *       <key>           key size bytes - always written most significant byte first
 *       <offset>        8 bytes - Offset of child node in index file.
 * For leaf nodes the items are
 *       <key>           key size bytes - always written most significant byte first
 *       <val>           val sized bytes - the value associated with the key.
 * Note in general the leaf nodes may not be the same size as the index nodes, though in
 * the important case where the values are file offsets they will be.
 */


// static void twoBitSeekTo(struct twoBitFile *tbf, char *name)
// /* Seek to start of named record.  Abort if can't find it. */
// {
//     if (tbf->bpt)
//     {
//         bits32 offset;
//         if (!bptFileFind(tbf->bpt, name, strlen(name), &offset, sizeof(offset)))
//         errAbort("%s is not in %s", name, tbf->bpt->fileName);
//         fseek(tbf->f, offset, SEEK_SET);
//     }
//     else
//     {
//         struct twoBitIndex *index = hashFindVal(tbf->hash, name);
//         if (index == NULL)
//             errAbort("%s is not in %s", name, tbf->fileName);
//         fseek(tbf->f, index->offset, SEEK_SET);
//     }
// }

// struct twoBitFile *twoBitOpenExternalBptIndex(char *twoBitName, char *bptName)
// /* Open file, read in header, but not regular index.  Instead use
//  * bpt index.   Beware if you use this the indexList field will be NULL
//  * as will the hash. */
// {
//     struct twoBitFile *tbf = twoBitOpenReadHeader(twoBitName);
//     tbf->bpt = bptFileOpen(bptName);
//     if (tbf->seqCount != tbf->bpt->itemCount)
//     errAbort("%s and %s don't have same number of sequences!", twoBitName, bptName);
//     return tbf;
// }


// static boolean rFind(struct bptFile *bpt, bits64 blockStart, void *key, void *val)
// /* Find value corresponding to key.  If found copy value to memory pointed to by val and return
//  * true. Otherwise return false. */
// {
//     /* Seek to start of block. */
//     udcSeek(bpt->udc, blockStart);
//
//     /* Read block header. */
//     UBYTE isLeaf;
//     UBYTE reserved;
//     bits16 i, childCount;
//     udcMustReadOne(bpt->udc, isLeaf);
//     udcMustReadOne(bpt->udc, reserved);
//     boolean isSwapped = bpt->isSwapped;
//     childCount = udcReadBits16(bpt->udc, isSwapped);
//
//     UBYTE keyBuf[bpt->keySize];   /* Place to put a key, buffered on stack. */
//
//     if (isLeaf)
//     {
//         for (i=0; i<childCount; ++i)
//         {
//             udcMustRead(bpt->udc, keyBuf, bpt->keySize);
//             udcMustRead(bpt->udc, val, bpt->valSize);
//             if (memcmp(key, keyBuf, bpt->keySize) == 0)
//                 return TRUE;
//         }
//         return FALSE;
//     }
//     else
//     {
//         /* Read and discard first key. */
//         udcMustRead(bpt->udc, keyBuf, bpt->keySize);
//
//         /* Scan info for first file offset. */
//         bits64 fileOffset = udcReadBits64(bpt->udc, isSwapped);
//
//         /* Loop through remainder. */
//         for (i=1; i<childCount; ++i)
//         {
//             udcMustRead(bpt->udc, keyBuf, bpt->keySize);
//             if (memcmp(key, keyBuf, bpt->keySize) < 0)
//                 break;
//             fileOffset = udcReadBits64(bpt->udc, isSwapped);
//         }
//         return rFind(bpt, fileOffset, key, val);
//     }
// }

// boolean bptFileFind(struct bptFile *bpt, void *key, int keySize, void *val, int valSize)
// /* Find value associated with key.  Return TRUE if it's found.
// *  Parameters:
// *     bpt - file handle returned by bptFileOpen
// *     key - pointer to key string, which needs to be bpt->keySize long
// *     val - pointer to where to put retrieved value
// */
// {
//     /* Check key size vs. file key size, and act appropriately.  If need be copy key to a local
//      * buffer and zero-extend it. */
//     if (keySize > bpt->keySize)
//     return FALSE;
//     char keyBuf[keySize];
//     if (keySize != bpt->keySize)
//     {
//         memcpy(keyBuf, key, keySize);
//         memset(keyBuf+keySize, 0, bpt->keySize - keySize);
//         key = keyBuf;
//     }
//
//     /* Make sure the valSize matches what's in file. */
//     if (valSize != bpt->valSize)
//     errAbort("Value size mismatch between bptFileFind (valSize=%d) and %s (valSize=%d)",
//         valSize, bpt->fileName, bpt->valSize);
//
//     /* Call recursive finder. */
//     return rFind(bpt, bpt->rootOffset, key, val);
// }


// struct bptFile *bptFileAttach(char *fileName, struct udcFile *udc)
// /* Open up index file on previously open file, with header at current file position. */
// {
//     /* Open file and allocate structure to hold info from header etc. */
//     struct bptFile *bpt = needMem(sizeof(*bpt));
//     bpt->fileName = fileName;
//     bpt->udc = udc;
//
//     /* Read magic number at head of file and use it to see if we are proper file type, and
//      * see if we are byte-swapped. */
//     bits32 magic;
//     boolean isSwapped = FALSE;
//     udcMustReadOne(udc, magic);
//     if (magic != bptSig)
//     {
//         magic = byteSwap32(magic);
//         isSwapped = bpt->isSwapped = TRUE;
//         if (magic != bptSig)
//             errAbort("%s is not a bpt b-plus tree index file", fileName);
//     }
//
//     /* Read rest of defined bits of header, byte swapping as needed. */
//     bpt->blockSize = udcReadBits32(udc, isSwapped);
//     bpt->keySize = udcReadBits32(udc, isSwapped);
//     bpt->valSize = udcReadBits32(udc, isSwapped);
//     bpt->itemCount = udcReadBits64(udc, isSwapped);
//
//     /* Skip over reserved bits of header. */
//     bits32 reserved32;
//     udcMustReadOne(udc, reserved32);
//     udcMustReadOne(udc, reserved32);
//
//     /* Save position of root block of b+ tree. */
//     bpt->rootOffset = udcTell(udc);
//
//     return bpt;
// }