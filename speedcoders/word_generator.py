#!/usr/bin/env python
import cPickle
import random
import string
from itertools import tee, izip

def window(iterable, size):
	"""Return a sliding window iterator over the given iterable

	Creates an iterotor that iterates a sliding window of the
	given size over the given iterable. For example, a call
	of window("abcde", 3) will produce the iterator
	[("a","b","c"), ("b","c","d") ("c","d","e")]

	Args:
	  iterable: The iterable over which to produce a sliding
	    window.
	  size: The size of the sliding window.
	"""
	iters = tee(iterable, size)
	for i in xrange(1, size):
		for each in iters[i:]:
			next(each, None)
	return izip(*iters)

class NGram(object):
	"""An ngram

	An ngram is an arbitrary sequence of characters of length N.
	This object represents a particular ngram of N characters.
	It tracks the accumulated probabilities that any given letter
	will follow this ngram based on all the words in the source
	corpus.

	Attrs:
	  ngram: A str. The ngram represented by this object.
	  count: An int. The number of times this ngram appears in
	    the source corpus.
	  first_prob: A float. The probabality that a word starts
	    with this ngram. Before finalizing, this attr contains
	    an integer representing a running count of how many times
	    this ngram has started a word in the source corpus.
	  next_letter_probs: A list of floats. The probabilities that
	    each letter in the alphabet will follow this ngram. Also
	    holds the probability that this ngram appears at the end
	    of a word. Before finalizing, this attr contains a list
	    of integers representing the running count of how many
	    times each letter has followed this ngram in the source
	    corpus.
	"""
	END_OF_WORD = 26

	def __init__(self, ngram):
		"""Initialize this ngram

		Args:
		  ngram: A str. The ngram this object represents.
		"""
		self.ngram = ngram
		self.count = 0
		self.first_prob = 0
		self.next_letter_probs = [0] * 27

	def finalize_probabilities(self, word_count):
		"""Convert running counts into probabilities

		Convert the running counts maintained in first_prob and
		next_letter_probs during ingest into probabilities.

		Args:
		  word_count: An int. The total number of words ingested.
		"""
		self.first_prob = float(self.first_prob) / word_count
		for idx, letter_count in enumerate(self.next_letter_probs):
			self.next_letter_probs[idx] = float(letter_count) / self.count

	def generate_letter(self):
		"""Generate the next letter

		Generates a letter that follows this ngram using the
		next_letter_probs calculated during ingest.
		"""
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
	"""Generates words random words

	Generates random words based on probabilities ingested from
	a given corpus of words. It considers each ngram in each
	word in the corpus, tracking the probability that an ngram
	will start a word and the probability that any given letter
	will follow an ngram. The ultimate purpose is to generate
	words that 'look like' the words in the corpus.

	Attrs:
	  probs: A dict mapping strings to NGrams.
	  word_count: An int. The total number of words ingested.
	  ngram_size: An int. The size of the ngrams that will be
	    considered when ingesting words. A larger ngram size
	    will require more memory but produce better results.
	"""

	def __init__(self, word_list, ngram_size=2):
		"""Initialize this WordGenerator

		Args:
		  word_list: A list of strings. This list contains the
		    words that will be used to initialize the
		    probabilities used to generate random words.
		  ngram_size: An int. The size of the ngrams considered
		    when ingesting words.
		"""
		self.probs = {}
		self.word_count = 0
		self.ngram_size = ngram_size
		for word in word_list:
			self.ingest_word(word)

	def ingest_word(self, word):
		"""Accumulates the given word in the probability totals

		Considers each ngram in the given word using a sliding window.
		Tracks the ngram that starts the word and the letter that follows
		each ngram.

		Args:
		  word: A string. The word to be ingested.
		"""
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
		"""Finalize the probabilities of all ngrams

		Finalizes the probabilities that an ngram will start a word
		and the probability that a given letter will follow each ngram.
		"""
		for ngram in self.probs:
			self.probs[ngram].finalize_probabilities(self.word_count)

	def generate_first_ngram(self):
		"""Generate the first ngram of a random word

		Uses the first_prob attrs from the ngrams in probs to randomly
		pick the first ngram of a random word.
		"""
		val = random.random()
		sum_so_far = 0.0
		ngram_iter = self.probs.itervalues()
		while sum_so_far < val:
			ngram = next(ngram_iter)
			sum_so_far += ngram.first_prob
		return ngram.ngram

	def generate_word(self):
		"""Generate a random word

		Generates a random word that 'looks like' the words ingested
		from the source corpus.
		"""
		word = self.generate_first_ngram()
		idx = 0
		next_letter = self.probs[word[idx:idx+self.ngram_size]].generate_letter()
		while next_letter:
			word += next_letter
			idx += 1
			next_letter = self.probs[word[idx:idx+self.ngram_size]].generate_letter()
		return word

def load(filename):
	"""Load a pickled version of a WordGenerator"""
	return cPickle.load(open(filename, "rb"))

