import nltk

# nltk.download('stopwords')
from nltk.corpus import stopwords

stop_words = stopwords.words("english")
stop_words.append("љљ")
import os.path
import asyncpg
import asyncio
import json
import gensim
from gensim.models.callbacks import CallbackAny2Vec
import sys
import yagmail

modelName = "word2vec.model"


class SentenceGenerator:
    def __init__(self, fileName):
        self.fileName = fileName
    #def __iter__(self):
    #    return self
    def __iter__(self):
        with open(self.fileName, 'r') as f:
            for line in f:
                yield line.strip('\n')

class EpochLogger(CallbackAny2Vec):
    def on_train_end(self, model):
        model.save(modelName)
        
    def on_epoch_end(self, model):
        model.save(modelName)
        yagmail.SMTP("codinfreakgf@gmail.com", "shEA45thr5").send("codinfreakgf@gmail.com", "debugging", "epoch ended")

logger = EpochLogger()


#async def createFile():
#    batchSize = 1000
#    records = 2359569
#    gen = SentenceGenerator()
#    fileName = "dump.txt"
#    for offset in range(422500, records, batchSize):
#        sents = await gen.load(batchSize, offset)
#        f = open(fileName, "a")
#        for sent in sents:
#            f.write(sent + "\n")
#        f.close()
#        if offset + batchSize > records:
#            break
#        if offset % 100000 == 500:
#            yagmail.SMTP("codinfreakgf@gmail.com", "shEA45thr5").send(
#                "codinfreakgf@gmail.com", "debugging", f"{offset} / {records}"
#            )
#        print(offset)
#

#async def main():
#    #    batchSize = int(sys.argv[1])
#    #   offset = int(sys.argv[2])
#    batchSize = 1000
#    offset = 200
#    gen = SentenceGenerator()
#    sents = await gen.load(batchSize, offset)
#    print(len(sents))
#    if os.path.isfile(modelName):
#        model = gensim.models.Word2Vec.load(modelName)
#    print(len(model.wv.vocab))
#    # else:
#    #    model = gensim.models.Word2Vec(sents, iter=5, size=200, min_count=1, callbacks=[logger])
#    model.train(sents, total_examples=len(sents), epochs=5, callbacks=[logger])

def train():
    gen = SentenceGenerator("dump.txt")
    model = gensim.models.Word2Vec(gen, iter=5, size=200, min_count=1, workers=5, callbacks=[logger])

train()