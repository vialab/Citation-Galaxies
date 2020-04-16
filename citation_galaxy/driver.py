from subprocess import call
import os

batchSize = 100000
records = 2359569
for i in range(0, records, batchSize):
    print(os.getcwd())
    dir = os.getcwd() +"/../citation_galaxy/"
    call(["python", dir+"word2vec.py", str(batchSize), str(i)])
    if(i + batchSize > records):
        break