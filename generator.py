#! /usr/bin/env python

import random
import string

class ProblemGenerator(object):
	def __iter__(self):
		yield CodingProblem("Write a function called 'foo' that takes one str argument and appends the string 'foo' to it.", "foo", lambda f: f("stuff") == "stufffoo")

class CodingProblem(object):
	def __init__(self, statement, expected_func, validator):
		self.statement = statement
		self.expected_func = expected_func
		self.validator = validator

	def validate(self, solution):
		try:
			exec solution
			self.validator(locals()[self.expected_func])
		except:
			return False
		return True

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
		self.update_solution(solution)
		return self.problem.valdiate(self.solution)

	def screw_solution(self):
		new_solution = ""
		for c in self.solution:
			if random.random() > self.SCREW_FACTOR:
				new_solution += self.random_char()
			else:
				new_solution += c