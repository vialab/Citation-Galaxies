import io
import struct
from loguru import logger

import string
import nltk
from nltk.tokenize.treebank import TreebankWordTokenizer, TreebankWordDetokenizer
from nltk.stem import WordNetLemmatizer
wnl = WordNetLemmatizer()
sbs = nltk.stem.snowball.EnglishStemmer()
tbwt = TreebankWordTokenizer()
stopwords = set( nltk.corpus.stopwords.words('english') )
punctuation = string.punctuation + "''``"
translate = str.maketrans('', '', string.punctuation)


# def 


def to_tsvector( text , min_token=3):
    # features = nltk.tokenize.sent_tokenize( text )
    # features = [ token.lower() for sentence in features for token in tbwt.tokenize(sentence) ]
    features = ( token.lower() for token in tbwt.tokenize( text.translate(translate) ) )
    word_dict = {}

    word_pos = 0
    for token in features:
        if token.isnumeric() or len(token) < min_token:
            continue
        
        if len(token) >= (1<<11):
            logger.warning("skipped giant string: '{}'",token)
            continue
        else:
        # token = wnl.lemmatize( token )

        # if token not in punctuation: # Word pos can't be larger than a 14bit integer. postgres constraint
            if (token not in stopwords):
                word_pos += 1
                # token = sbs.stem( token )
                datum = word_dict.setdefault( sbs.stem( token ), [] )

                datum.append( word_pos )

                if word_pos>= (1<<14): # 14 bits is the max size of the postgre tsvector WordEntry position data
                    datum.pop()
                    # so we'll up the limit of what consititutes a minimum size token and try again.
                    # logger.warning(f'caught too big of a word position, retrying with higher min_token={min_token+1}.')
                    logger.warning(f'caught too big of a word position, returning clipped tsvector.')
                    return word_dict
            # datum.sort()
            
        #     print("\n\n\n\nFatal error word_pos too long.")
        #     break
    
    for word, positions in word_dict.items():
        if len(positions) >= (1<<20):
            logger.warning("caught too many word positions, retrying with higher min_token")
            return to_tsvector( text, min_token+1 )

            
    # tsvector = sorted( ( (word,sorted(pos)) for word,pos in word_dict.items() ), key=lambda tup: tup[0])
    # tsvector = {}
    

    return word_dict


def encode_tsvector_text( tsvector ):
    return ' '.join( ( f'{key}:' + ','.join((str(i) for i in val)) for key,val in tsvector.items() ) )
    # pass

def decode_tsvector_text(txt_vector):
    return txt_vector

def encode_tsvector2( tsvector ):
    bufret = io.BytesIO()
    bufret.write( struct.pack( '!I', len(tsvector) ) )

    # Iterate over the word/position tuples.
    for word in sorted(tsvector.keys()):
        positions = tsvector[word]
        # write the word in the 'client' encoding (does that mean the database encoding?)
        # bufret.write( struct.pack( 's', word.encode('utf-8') ) )
        # bufret.write( bytes(word, 'utf-8') )
        bufret.write( word.encode('utf-8') )
        bufret.write( struct.pack('!x') ) #Null terminate string

        # Write uint16 # of positions
        bufret.write( struct.pack( '!H', len(positions) ) )

        #for each lexeme, uint16 position in document
        for position in sorted(positions, key=lambda x: x & 0x3fff ):
            bufret.write( struct.pack( '!H', position))
        # bufret.write( struct.pack( '>0H'))

    return bufret.getbuffer()

def encode_tsvector( tsvector ):
    bufret = io.BytesIO()
    bufret.write( struct.pack( '!I', len(tsvector) ) )

    # Iterate over the word/position tuples.
    for word in tsvector:
        # write the word in the 'client' encoding (does that mean the database encoding? tbd...)
        bufret.write( bytes(word[0], 'utf-8') )

        # Null terminate string, and write uint16 # of positions
        bufret.write( struct.pack( '!xH', len(word[1]) ) )

        #for each lexeme, uint16 position in document
        for position in word[1]:
            bufret.write( struct.pack( '!H', position))

    return bufret.getbuffer()

def decode_tsvector(bin_vector):
    tsvector = []

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

        worddata = ( word, struct.unpack_from( f'!{numberpositions}H', bin_vector, offset ) )
        offset += 2*numberpositions

        tsvector.append( worddata )

    return tsvector


def divide_chunks(l, n): 
    for i in range(0, len(l), n):  
        yield l[i:i + n] 




# import os
# import re
# import subprocess
# from datetime import datetime
# from lxml import html
# from dateutil import parser

# MEDLINE = 'ftp://ftp.nlm.nih.gov/nlmdata/.medleasebaseline/gz/'
# PUBMED_OA = 'ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_bulk/'

# def get_update_date(option='medline'):
#     """
#     Download index page and grab lastest update from Medline
#     or Pubmed Open-Access subset
#     Parameters
#     ----------
#     option: str, 'medline' for MEDLINE or 'oa' for Pubmed Open-Access
#     Example
#     -------
#     >> date = get_update_date('medline')
#     >> print(date.strftime("%Y_%m_%d"))
#     """
#     if option == 'medline':
#         link = MEDLINE
#     elif option == 'oa':
#         link = PUBMED_OA
#     else:
#         link = MEDLINE
#         print('Specify either "medline" or "oa" for repository')

#     if os.path.exists('index.html'):
#         subprocess.call(['rm', 'index.html'])
#     subprocess.call(['wget', link])

#     with open('index.html', 'r') as f:
#         page = f.read()

#     date_all = list()
#     tree = html.fromstring(page)
#     for e in tree.xpath('body/pre/a'):
#         if 'File' in e.tail:
#             s = e.tail
#             s_remove = re.sub(r'\([^)]*\)', '', s)
#             s_remove = re.sub('File', '', s_remove).strip()
#             d = parser.parse(s_remove)
#             date_all.append(d)
#     date = max(date_all) # get lastest update
    
#     if os.path.exists('index.html'):
#         subprocess.call(['rm', 'index.html'])
#     return date
