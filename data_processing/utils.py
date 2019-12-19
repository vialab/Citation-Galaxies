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

import io
import struct

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

def to_tsvector( text ):
    # features = nltk.tokenize.sent_tokenize( text )
    # features = [ token.lower() for sentence in features for token in tbwt.tokenize(sentence) ]
    features = ( token.lower() for token in tbwt.tokenize( text.translate(translate) ) )
    word_dict = {}

    word_pos = 0
    for token in features:
        # token = wnl.lemmatize( token )

        if token not in punctuation:
            word_pos += 1

            if token not in stopwords and len(token)>0:
                # token = sbs.stem( token )
                datum = word_dict.setdefault( sbs.stem( token ), [] )

                datum.append( word_pos )
            
    tsvector = sorted( ( (word,pos) for word,pos in word_dict.items() ), key=lambda tup: tup[0])

    return tsvector

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

# @profile
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
