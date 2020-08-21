import json
import nltk
from nltk.tokenize import word_tokenize, sent_tokenize
from langdetect import detect
import re

languageConversionBuffer={"fr":"french","en":"english", "es":"spanish"}

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
        buffer = buffer.lower()
        if buffer == "":
            result.append({"word": {}, "sent": {}, "lang":"", "sent_length":0, "word_length":0}); 
            continue
        try:
            lang = detect(buffer)
        except:
            lang = "en"
        if(lang != "en" and lang != "fr"):
            result.append({"word": {}, "sent": {}, "lang":"", "sent_length":0, "word_length":0})
            continue
        sentMap = sentence_analysis(buffer, languageConversionBuffer[lang])
        wordMap = word_analysis(buffer, languageConversionBuffer[lang])
        sent_data = sent_tokenize(buffer, language=languageConversionBuffer[lang])
        word_data = word_tokenize(buffer, language=languageConversionBuffer[lang])
        sent_length = len(sent_data)
        word_length = len(word_data)
        if lng == "":
            lng = lang
        result.append({"word": wordMap, "sent": sentMap, "lang":lng, "sent_length":sent_length, "word_length":word_length, "sent_data":sent_data, "word_data":word_data})
    return result
    
def remove_markup(data):
    buffer = ""
    TAG_RE = re.compile(r'<[^>]+>')
    xml = ["<alinea>","</alinea>"]
    for entry in data:
        temp = TAG_RE.sub('', entry)
        buffer += temp + " "
    return buffer
        
def sentence_analysis(data, language):
    buffer = sent_tokenize(data, language=language)
    sentence_map={}
    for i in range(0, len(buffer)):
        result = word_tokenize(buffer[i], language=language)
        for word in result:
            if not word in sentence_map:
                sentence_map[word] = []
            sentence_map[word].append(i)
    return sentence_map

def word_analysis(data, language):
    buffer = word_tokenize(data, language=language)
    word_map={}
    for i in range(0, len(buffer)):
        if not buffer[i] in word_map:
            word_map[buffer[i]] = []
        word_map[buffer[i]].append(i)
    return word_map

def citation_analysis(data):
    return