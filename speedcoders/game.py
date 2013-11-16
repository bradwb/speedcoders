#! /usr/bin/env python

import json
import random
import threading

import sc_exceptions as exc
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

	def reset(self):
		self.token = False
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
		self.reset()

	def receive_token(self):
		if self.token:
			raise exc.GameOverException("{0} lost!".format(self.user))
		else:
			self.token = True
			self.coding_task = next(self.challenge_generator)

	def get_challenge(self):
		if not self.token:
			raise exc.IllegalStateException("User {0} is not active.".format(self.user))

		if not self.coding_task:
			self.coding_task = next(self.challenge_generator)
		return self.to_json()

	def submit_answer(self, solution):
		assert self.coding_task is not None
		return self.coding_task.submit_solution(solution)

	def to_json(self):
		return json.dumps({
			"user": self.user,
			"active": self.token,
			"seat_num": self.num,
			"coding_task": self.coding_task.problem.statement if self.coding_task else None,
			"solution": self.coding_task.solution if self.coding_task else None,
		})


class Table(object):
	def __init__(self, seats, tokens):
		self.seat_count = seats
		self.token_count = tokens

		self.table = [Seat(num) for num in xrange(self.seat_count)]
		self.state = SETUP
		self.last_loser = ""
		self.lock = threading.RLock()

	def validate_seat_num(self, seat_num):
		if seat_num < 0 or seat_num >= self.seat_count:
			raise exc.IllegalArgumentException("Seat num should be between 0 and {0}, but was {1}.".format(self.seat_count - 1, seat_num))

	def full(self):
		return all(lambda seat: not seat.empty(), self.table)

	def get_seat(self, user):
		for seat in self.table:
			if seat.user == user:
				return seat
			return None

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

			if self.get_seat(user) is not None:
				raise exc.IllegalStateException("{0} is already sitting in seat {1}.".format(user, seat.display_num))

			seat = self.table[seat_num]
			seat.sit_down(user)
			if self.full():
				self.state = READY
			return seat.to_json()

	def remove_user(self, user):
		with self.lock:
			assert self.state == SETUP or self.state == READY
			seat = self.get_seat(user)
			if seat is None:
				raise exc.IllegalStateException("{0} is not currently in a seat.".format(user))
				seat.stand_up()
				self.state = SETUP
				return seat.to_json()

	def reset_tokens(self):
		with self.lock:
			assert self.state == READY
			for seat in self.table:
				seat.token = False

			seat_num = random.randint(0, self.seat_count - 1)
			inc = self.seat_count // self.token_count
			for i in xrange(self.token_count):
				seat = self.table[seat_num]
				seat.receive_token()
				seat_num = (seat_num + inc) % self.seat_count

	def play(self):
		with self.lock:
			assert self.state == READY
			self.reset_tokens()
			self.state = PLAYING

	def end_game(self, loser):
		with self.lock:
			assert self.state == PLAYING
			self.last_loser = loser
			self.state == READY

	def pass_token(self, seat):
		with self.lock:
			assert self.state == PLAYING
			self.table[seat.num].pass_token()
			self.table[(seat.num + 1) % self.seat_count].receive_token()

	def get_challenge(self, user):
		with self.lock:
			seat = self.get_seat(user)
			if seat is None:
				raise exc.IllegalStateException("User {0} is not at the table.".format(user))
			return self.to_json()

	def submit_answer(self, user, solution):
		with self.lock:
			seat = self.get_seat(user)
			if seat is None:
				raise exc.IllegalStateException("User {0} is not at the table.".format(user))

			if seat.submit_answer(solution):
				try:
					self.pass_token(seat.num)
				except exc.GameOverException as goe:
					self.end_game(goe.loser)
			return self.to_json()

	def to_json(self):
		return json.dumps({
			"seat_count": self.seat_count,
			"token_count": self.token_count,
			"seats": [seat.to_json() for seat in self.table],
			"state": self.state,
			"last_loser": self.last_loser
		})


