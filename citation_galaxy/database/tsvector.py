import io
import struct

def encode_tsvector( tsvector ):
    bufret = io.BytesIO()
    bufret.write( struct.pack( '!I', len(tsvector) ) )

    # Iterate over the word/position tuples.
    for word in sorted(tsvector.keys()):
        positions = tsvector[word]
        # write the word in the 'client' encoding (does that mean the database encoding?)
        bufret.write( word.encode('utf-8') )
        bufret.write( struct.pack('!x') ) #Null terminate string

        # Write uint16 # of positions
        bufret.write( struct.pack( '!H', len(positions) ) )

        #for each lexeme, uint16 position in document
        for position in positions:
            bufret.write( struct.pack( '!H', position))

    return bufret.getbuffer()

def decode_tsvector(bin_vector):
    tsvector={}
    wordcount = struct.unpack_from( '!I', bin_vector, 0)[0]
    offset = 4
    for wordidx in range(wordcount):
        wordbuf = []
        wordlength = 0
        while struct.unpack_from( '!s', bin_vector, offset + wordlength )[0] != b'\x00':
            wordlength += 1
        word = struct.unpack_from( f'!{wordlength}s', bin_vector, offset)[0].decode('utf-8')
        offset += wordlength+1
        numberpositions = struct.unpack_from( '!H', bin_vector, offset )[0]
        offset += 2
        worddata = struct.unpack_from( f'!{numberpositions}H', bin_vector, offset )
        offset += 2*numberpositions
        tsvector.setdefault(word,worddata)
    return tsvector