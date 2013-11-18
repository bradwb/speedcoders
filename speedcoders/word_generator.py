#!/usr/bin/env python
import cPickle
import random
import string
from itertools import tee, izip

def window(iterable, size):
	iters = tee(iterable, size)
	for i in xrange(1, size):
		for each in iters[i:]:
			next(each, None)
	return izip(*iters)

class NGram(object):
	END_OF_WORD = 26

	def __init__(self, ngram):
		self.ngram = ngram
		self.count = 0
		self.first_prob = 0
		self.next_letter_probs = [0] * 27

	def finalize_probabilities(self, word_count):
		self.first_prob = float(self.first_prob) / word_count
		for idx, letter_count in enumerate(self.next_letter_probs):
			self.next_letter_probs[idx] = float(letter_count) / self.count

	def generate_letter(self):
		val = random.random()
		sum_so_far = 0.0
		idx = -1
		while sum_so_far < val:
			idx += 1
			sum_so_far += self.next_letter_probs[idx]
		if idx == self.END_OF_WORD:
			return None
		return string.ascii_lowercase[idx]


class WordGenerator(object):
	def __init__(self, word_list, ngram_size=2):
		self.probs = {}
		self.word_count = 0
		self.ngram_size = ngram_size
		for word in word_list:
			self.injest_word(word)

	def injest_word(self, word):
		if len(word) < self.ngram_size:
			return
		self.word_count += 1
		last_ngram = None
		for ngram in ("".join(chars) for chars in window(word, self.ngram_size)):
			if ngram not in self.probs:
				self.probs[ngram] = NGram(ngram)

			if last_ngram:
				# this is not the first ngram in the word, so the last char follows
				# previous ngram.
				last_ngram.next_letter_probs[ord(ngram[-1]) - ord('a')] += 1
			else:
				# this is the first ngram in the word, so record it as such
				self.probs[ngram].first_prob += 1
			last_ngram = self.probs[ngram]
			last_ngram.count += 1
		if last_ngram:
			# indicate that the last ngram was followed by the end of the word.
			last_ngram.next_letter_probs[NGram.END_OF_WORD] += 1

	def finalize_probabilities(self):
		for ngram in self.probs:
			self.probs[ngram].finalize_probabilities(self.word_count)

	def generate_first_ngram(self):
		val = random.random()
		sum_so_far = 0.0
		ngram_iter = self.probs.itervalues()
		while sum_so_far < val:
			ngram = next(ngram_iter)
			sum_so_far += ngram.first_prob
		return ngram.ngram

	def generate_word(self):
		word = self.generate_first_ngram()
		idx = 0
		next_letter = self.probs[word[idx:idx+self.ngram_size]].generate_letter()
		while next_letter:
			word += next_letter
			idx += 1
			next_letter = self.probs[word[idx:idx+self.ngram_size]].generate_letter()
		return word

if __name__ == "__main__":
	ngrams = 3
	wordlist = open("/usr/share/dict/words").readlines()
	wordlist = [word.strip() for word in wordlist if all(c in string.ascii_lowercase for c in word.strip())]
	w = WordGenerator(wordlist, ngrams)
	w.finalize_probabilities()

	cPickle.dump(w, open("word_gen{0}.pickle".format(ngrams), "w"), -1)
