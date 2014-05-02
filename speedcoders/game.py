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
	"""Represents a seat in a speedcoders game

	Each seat can be occupied by a player. The seat also tracks whether
	the player is already working on a coding challenge.

	Attrs:
	  user: A string. The username of the user occupying this chair or
	    None if unoccupied.
	  token: A bool. Indicates whether the player in this seat is
	    currently working on a coding challenge.
	  num: An int. The number of this seat.
	  coding_task: A CodingProblemAssignment. The problem currently
	    being worked on or None if the user is not working on a
	    problem.
	"""
	challenge_generator = iter(generator.ProblemGenerator())

	def __init__(self, seat_num, user=None, token=False):
		"""Initialize this Seat

		Args:
		  seat_num: An int. The seat number.
		  user: A string. The username of the user in this
		    seat. [Default: None]
		  token: A bool: Whether or not this seat should
			start with a programming challenge. [Default: False]
		"""
		self.user = user
		self.token = token
		self.num = seat_num

		self.coding_task = None

	def reset(self):
		"""Reset the token and coding task"""
		self.token = False
		self.coding_task = None

	@property
	def disp_num(self):
		"""Displayable seat number"""
		return self.num + 1

	def sit_down(self, user):
		"""Attempt to place a user in this seat

		Args:
		  user: A string. The username of the user who wants to
		    sit down.

		Throws: IllegalStateException if this seat is occupied.
		"""
		if self.empty():
			self.user = user
		else:
			raise exc.IllegalStateException("Seat {0} is currently occupied by {1}.".format(self.disp_num, self.user))

	def stand_up(self):
		"""Remove the current user from this seat

		Throws: IllegalStateException if this seat is unoccupied.
		"""
		if not self.empty():
			self.user = None
		else:
			raise exc.IllegalStateException("Seat {0} is not currently occupied.".format(self.disp_num))

	def empty(self):
		"""Returns True if this seat is empty"""
		return self.user is None

	def pass_token(self):
		"""Remove the token from this seat"""
		assert self.token
		self.reset()

	def receive_token(self):
		"""Add the token to this seat

		Throws: GameOverException if this seat already has a token.
		"""
		if self.token:
			raise exc.GameOverException("{0} lost!".format(self.user))
		else:
			self.token = True
			self.coding_task = next(self.challenge_generator)

	def submit_answer(self, solution):
		"""Test a solution for correctness"""
		assert self.coding_task is not None
		return self.coding_task.submit_solution(solution)

	def to_json(self):
		"""Returns a json representation of this seat"""
		return json.dumps({
			"user": self.user,
			"active": self.token,
			"seat_num": self.num,
			"coding_task": self.coding_task.problem.statement if self.coding_task else None,
			"solution": self.coding_task.solution if self.coding_task else None,
		})


class Table(object):
	"""Represents a SpeedCoders table.

	This object contains the initial conditions and main state of the
	game.

	Attrs:
	  seat_count: An int. The number of seats that this game will hold.
	  token_count: An int. The number of tokens that will be seeded on
	    the table.
	  table: A list of Seats. The seats at this table.
	  state: A string. The state of the current game.
	  last_loser: A string. The username of the last user to lose a game.
	"""

	def __init__(self, seats, tokens):
		"""Initialize this Table

		Args:
		  seats: An int. The number of seats that this game will hold.
		  tokens: An int. The number of tokens that will be seeded on
		    the table.
		"""
		self.seat_count = seats
		self.token_count = tokens

		self.table = [Seat(num) for num in xrange(self.seat_count)]
		self.state = SETUP
		self.last_loser = ""
		self._lock = threading.RLock()

	def validate_seat_num(self, seat_num):
		"""Validate that a seat number is valid for this table

		Args:
		  seat_num: An int.

		Throws:
		  IllegalArgumentException if the seat number is not valid.
		"""
		if seat_num < 0 or seat_num >= self.seat_count:
			raise exc.IllegalArgumentException("Seat num should be between 0 and {0}, but was {1}.".format(self.seat_count - 1, seat_num))

	def full(self):
		"""Returns whether this table is full"""
		return all(lambda seat: not seat.empty(), self.table)

	def get_seat(self, user):
		"""Returns the Seat assigned to the given user

		Args:
		  user: A string. The user whose seat should be returned.

		Returns: The user's Seat or None if the user doesn't have
		  a seat.
		"""
		for seat in self.table:
			if seat.user == user:
				return seat
		return None

	def add_user(self, user, seat_num=None):
		"""Add a user to this table

		Add a user to an empty seat at this table. If no seat
		number is specified, the first empty seat will be
		given to the user. This should only be called during
		SETUP.

		Args:
		  user: A string. The user to add to the table.
		  seat_num: An int. The seat to sit doewn in. If not
		    specified, the first empty seat will be chosen.
		    [Default: None]

		Throws: IllegalStateException if the specified seat is
		  already occupied, the user is already sitting in a
		  seat, or the table is already full.

		Returns: A json representation of the selected seat.
		"""
		seat_num is None or self.validate_seat_num(seat_num)

		with self._lock:
			assert self.state == SETUP
			if self.full():
				raise exc.IllegalStateException("No empty seats.")

			if self.get_seat(user) is not None:
				raise exc.IllegalStateException("{0} is already sitting in seat {1}.".format(user, seat.display_num))

			seat = self.table[seat_num]
			seat.sit_down(user)
			if self.full():
				self.state = READY
			return seat.to_json()

	def remove_user(self, user):
		"""Remove a user from the table

		Args:
		  user: A string. The user to remove.

		Throws: IllegalStateException if the user is not at the table.

		Returns: A json representation of the vacated seat.
		"""
		with self._lock:
			assert self.state == SETUP or self.state == READY
			seat = self.get_seat(user)
			if seat is None:
				raise exc.IllegalStateException("{0} is not currently in a seat.".format(user))
			seat.stand_up()
			self.state = SETUP
			return seat.to_json()

	def reset_tokens(self):
		"""Redistribute tokens as equally as possible around the table

		Table must be READY. Distributes tokens evenly around the table
		starting with a random user.
		"""
		with self._lock:
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
		"""Start the game"""
		with self._lock:
			assert self.state == READY
			self.reset_tokens()
			self.state = PLAYING

	def end_game(self, loser):
		"""End the game"""
		with self._lock:
			assert self.state == PLAYING
			self.last_loser = loser
			self.state == READY

	def pass_token(self, seat):
		"""Move a token from one seat to the next"""
		with self._lock:
			assert self.state == PLAYING
			self.table[seat.num].pass_token()
			self.table[(seat.num + 1) % self.seat_count].receive_token()

	def get_challenge(self, user):
		"""Get a coding challenge

		Get a coding challenge for a user.

		Args:
		  user: A string. The user to get a challenge for

		Throws: IllegalStateException if the user is not at the table

		Returns: A json payload representing the current state of the
		  game.
		"""
		with self._lock:
			seat = self.get_seat(user)
			if seat is None:
				raise exc.IllegalStateException("User {0} is not at the table.".format(user))
			return self.to_json()

	def submit_answer(self, user, solution):
		"""Submit a potential answer to a challenge

		Args:
		  user: A string. The user who is submitting a solution.
		  solution: A string. The python code which should be checked for
		    correctness.

		Throws: IllegalStateException if the user is not in a seat.

		Returns: A json payload representing the current state of the
		  game.
		"""
		with self._lock:
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
		"""Returns a json representation of this Table"""
		return json.dumps({
			"seat_count": self.seat_count,
			"token_count": self.token_count,
			"seats": [seat.to_json() for seat in self.table],
			"state": self.state,
			"last_loser": self.last_loser
		})


