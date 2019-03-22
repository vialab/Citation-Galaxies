import sys
from gensim.models import Word2Vec

EMBEDDINGS_WORD2VEC_MODEL_FILE = "./model/vectors/word2vec.model"

def get_model():
    model = Word2Vec.load(EMBEDDINGS_WORD2VEC_MODEL_FILE)
    return model

w2v = get_model()
word_list = w2v.most_similar(sys.argv[1])

print("word,score")
for word in word_list:
    print(word[0] + "," + str(word[1]))
