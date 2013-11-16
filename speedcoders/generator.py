#! /usr/bin/env python

import random
import string

import challenges

class StaticProblemGenerator(object):
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
	SCREW_FACTOR = 0.05
	SCREW_CHARS = string.ascii_letters + string.digits + string.punctuation

	def random_char(self):
		return self.SCREW_CHARS[random.randint(0, len(self.SCREW_CHARS) - 1)]

	def __init__(self, problem):
		self.problem = problem
		self.solution = ""

	def update_solution(self, solution):
		self.solution = solution

	def submit_solution(self, solution):
		# wipe out solution on submit.
		self.update_solution("")
		return self.problem.validate(solution)

	def screw_solution(self):
		new_solution = ""
		for c in self.solution:
			if random.random() > self.SCREW_FACTOR:
				new_solution += self.random_char()
			else:
				new_solution += c
