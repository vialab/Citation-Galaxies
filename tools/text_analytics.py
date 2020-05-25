import json
from nltk.tokenize import word_tokenize, sent_tokenize
import re

def parse_markup(data):
    buffer = json.loads(data["text"])
    languageBuffer={}
    result=[]
    for text in buffer:
        if text["text"] == None:
            continue
        if not text["lang"] in languageBuffer:
            languageBuffer[text["lang"]] = []
        languageBuffer[text["lang"]].append(text["text"])
    for lng in languageBuffer.keys():
        for entry in languageBuffer[lng]:
            if entry == None:
                languageBuffer[lng].remove(entry)
                if not len(languageBuffer[lng]):
                    del languageBuffer[lng]
                    continue
        if not lng in languageBuffer:
            continue
        buffer = remove_markup(languageBuffer[lng])
        sentMap = sentence_analysis(buffer)
        wordMap = word_analysis(buffer)
        result.append({"word": wordMap, "sent": sentMap, "lang":lng})
    return result
    
def remove_markup(data):
    buffer = ""
    TAG_RE = re.compile(r'<[^>]+>')
    xml = ["<alinea>","</alinea>"]
    for entry in data:
        temp = TAG_RE.sub('', entry)
        buffer += temp + " "
    return buffer
        
def sentence_analysis(data):
    buffer = sent_tokenize(data)
    sentence_map={}
    for i in range(0, len(buffer)):
        result = word_tokenize(buffer[i])
        for word in result:
            if not word in sentence_map:
                sentence_map[word] = []
            sentence_map[word].append(i)
    return sentence_map

def word_analysis(data):
    buffer = word_tokenize(data)
    word_map={}
    for i in range(0, len(buffer)):
        if not buffer[i] in word_map:
            word_map[buffer[i]] = []
        word_map[buffer[i]].append(i)
    return word_map

def citation_analysis(data):
    return