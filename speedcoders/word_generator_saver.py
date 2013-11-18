#! /usr/bin/env python

import cPickle
import string

from word_generator import WordGenerator

ngrams = 3
wordlist = open("/usr/share/dict/words").readlines()
wordlist = [word.strip() for word in wordlist if all(c in string.ascii_lowercase for c in word.strip())]
w = WordGenerator(wordlist, ngrams)
w.finalize_probabilities()

cPickle.dump(w, open("word_gen{0}.pickle".format(ngrams), "wb"))
