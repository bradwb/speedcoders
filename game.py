#! /usr/bin/env python

import random
import threading

import exceptions as exc
import generator

# game states
SETUP = "setup"
READY = "ready"
PLAYING = "playing"

class Seat(object):
	challenge_generator = iter(generator.ProblemGenerator())

	def __init__(self, seat_num, user=None, token=False):
		self.user = user
		self.token = token
		self.num = seat_num

		self.coding_task = None

	@property
	def disp_num(self):
		return self.num + 1

	def sit_down(self, user):
		if self.empty():
			self.user = user
		else:
			raise exc.IllegalStateException("Seat {0} is currently occupied by {1}.".format(self.disp_num, self.user))

	def stand_up(self):
		if not self.empty():
			self.user = None
		else:
			raise exc.IllegalStateException("Seat {0} is not currently occupied.".format(self.disp_num))

	def empty(self):
		return self.user is None

	def pass_token(self):
		assert self.token
		self.token = False

	def receive_token(self):
		if self.token:
			raise exc.GameOverException("{0} lost!".format(self.user))
		else:
			self.token = True

	def to_json(self):
		return "{}"


class Table(object):
	def __init__(self, seats, tokens):
		self.seats = seats
		self.tokens = tokens

		self.table = [Seat(num) for num in xrange(self.seats)]
		self.state = SETUP
		self.lock = threading.RLock()

	def validate_seat_num(self, seat_num):
		if seat_num < 0 or seat_num >= self.seats:
			raise exc.IllegalArgumentException("Seat num should be between 0 and {0}, but was {1}.".format(self.seats - 1, seat_num))

	def full(self):
		return all(lambda seat: not seat.empty(), self.table)

	def add_user(self, user, seat_num=None):
		seat_num is None or self.validate_seat_num(seat_num)

		with self.lock:
			assert self.state == SETUP
			if seat_num is None:
				try:
					seat_num = next(seat.num for seat in self.table
							if seat.empty())
				except StopIteration:
					raise exc.IllegalStateException("No empty seats.")

			self.table[seat_num].sit_down(user)
			if self.full():
				self.state = READY

	def remove_user(self, seat_num):
		self.validate_seat_num(seat_num)
		with self.lock:
			assert self.state == SETUP or self.state == READY
			self.table[seat_num].stand_up()
			self.state = SETUP

	def reset_tokens(self):
		with self.lock:
			assert self.state == SETUP
			for seat in self.table:
				seat.token = False

			seat_num = random.randint(0, self.seats - 1)
			inc = self.seats // self.tokens
			for i in xrange(self.tokens):
				seat = self.table[seat_num]
				seat.token = True
				seat_num = (seat_num + inc) % self.seats

	def play(self):
		with self.lock:
			assert self.state == READY
			self.state = PLAYING

	def pass_token(self, seat):
		with self.lock:
			assert self.state == PLAYING
			self.table[seat.num].pass_token()
			self.table[(seat.num + 1) % self.seats].receive_token()

	def to_json(self):
		return "{}"

	def render(self):
		pass


