import gensim
from gensim.models.callbacks import CallbackAny2Vec


class EpochLogger(CallbackAny2Vec):
    def on_train_end(self, model):
        model.save("modelName")
        print("finished")


class WordRecommender:
    model = None

    def __init__(self):
        self.model = gensim.models.KeyedVectors.load_word2vec_format("google-word2vec.bin", binary=True)

    def getRecommendation(self, words, topN):
        return self.model.most_similar(positive=words, topn=topN)


# recommender = WordRecommender()
