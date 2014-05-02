#! /usr/bin/env python

import random
import string

import challenges

class StaticProblemGenerator(object):
	"""A simple problem generator for testing

	Always generates the same problem
	"""
	def __iter__(self):
		while True:
			yield CodingProblemAssignment(
					challenges.CodingProblem(
						"Write a function called 'foo' that takes one str argument and appends the string 'foo' to it.",
						"foo",
						lambda f: f("stuff") == "stufffoo"
					)
				)

class ProblemGenerator(object):
	"""A coding problem generator

	Generates a random coding problem from a number
	of specific generators.
	"""
	def __iter__(self):
		generators = (
			iter(challenges.AppendProblemGenerator()),
			iter(challenges.AdditionProblemGenerator()),
			iter(challenges.SubstitutionProblemGenerator()),
		)
		while True:
			yield CodingProblemAssignment(
				next(random.choice(generators))
			)

class CodingProblemAssignment(object):
	"""A coding assignment

	Contains the problem being worked on and the student's current progress
	at implementing a solution.
	"""
	SCREW_FACTOR = 0.05
	SCREW_CHARS = string.ascii_letters + string.digits + string.punctuation

	def random_char(self):
		"""Generate a random printable character"""
		return random.choice(self.SCREW_CHARS)

	def __init__(self, problem):
		"""Initialize this CodingProblemAssignment

		Args:
		  problem: A CodingProblem. The problem being assigned.
		"""
		self.problem = problem
		self.solution = ""

	def update_solution(self, solution):
		"""Update the solution currently saved to this assignment

		Args:
		  solution: A string. The solution is a string of python code
		    (possibly incomplete)
		"""
		self.solution = solution

	def submit_solution(self, solution):
		"""Grade the given solution

		Executes the given solution against a set of tests. Also
		wipes out the current solution so if the user's submission
		fails they need to start over.

		Args:
		  solution: A string. The solution is a string of pythong code.

		Returns: A bool. Whether or not the solution passed all tests.
		"""
		# wipe out solution on submit.
		self.update_solution("")
		return self.problem.validate(solution)

	def screw_solution(self):
		"""Substitute random characters in the solution

		Change random characters in the solution currently
		being worked on to random values. The user then has
		to deal with the fallout.
		"""
		new_solution = ""
		for c in self.solution:
			if random.random() > self.SCREW_FACTOR:
				new_solution += self.random_char()
			else:
				new_solution += c
		self.solution = new_solution
