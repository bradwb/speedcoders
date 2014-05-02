import random

import word_generator

WORD_GENERATOR = word_generator.load("word_gen4.pickle")

class CodingProblem(object):
	"""A procedurally generated coding problem

	Note that this is NOT a safe class. Execing code passed in
	from a user is a bad idea, generally. Only run this in
	carefully controlled situations where you trust the users.

	Attrs:
	  statement: A str. The statement of the problem sent to the user.
	  expected_func: A str. The name of the function that the user
	    is instructed to write.
	  validator: A function. The validator takes the user's function
	    as an argument and calls it against a set of test cases,
	    verifying correctness.
	"""

	def __init__(self, statement, expected_func, validator):
		"""Initialize this CodingProblem

		Args:
		  statement: A str. The statement of the problem sent to the user.
		  expected_func: A str. The name of the function that the user
		    is instructed to write.
		  validator: A function. The validator takes the user's function
		    as an argument and calls it against a set of test cases,
		    verifying correctness.
		"""
		self.statement = statement
		self.expected_func = expected_func
		self.validator = validator

	def validate(self, solution):
		"""Validate the solution against the validator

		Execs the user's code and runs it agains the validator. This is
		NOT a safe function. Execing code passed in from a user is a
		bad idea, generally. Only run this in carefully controlled
		situations where you trust the users.

		Args:
		  solution: A string. Contrains the user's python code.

		Returns: A bool. True if the user's solution passed
		  all tests.
		"""
		try:
			exec solution
			return self.validator(locals()[self.expected_func])
		except:
			import traceback
			traceback.print_exc()
			return False

	def __str__(self):
		return self.statement

class IfStatement(object):
	"""A procedurally generated if condition

	A generated if condition that the user's code must
	fulfill.

	Attrs:
	  statement: A str. A part of the problem statement describing
	    when the if condition should evaluate to true.
	  is_strue: A function. Takes a value and returns true if this
	    if condition is satisfied by the value.
	  test_cases: A tuple of values. These values are designed to
	    test boundary conditions of the if statement to make sure
	    it is implemented correctly.
	"""

	def __init__(self, statement, is_true, test_cases):
		"""Initialize this IfStatement

		Args:
		  statement: A str. A part of the problem statement describing
		    when the if condition should evaluate to true.
		  is_strue: A function. Takes a value and returns true if this
		    if condition is satisfied by the value.
		  test_cases: A tuple of values. These values are designed to
		    test boundary conditions of the if statement to make sure
		    it is implemented correctly.
		"""
		self.statement = statement
		self.is_true = is_true
		self.test_cases = test_cases

	def __str__(self):
		return self.statement

def random_string():
	"""Generate an english-like random word"""
	return WORD_GENERATOR.generate_word()

def validator(validator_gen, test_cases):
	"""Create a function that will validate a solution

	Args:
	  validator_gen: A function that returns a function. The
	    validator_gen function takes a test case and returns a
	    new function that will accept a function written by a
	    user and evaluate it against the test case.
	  test_cases: A list of values. The values are used to make
	    a comprehensive set of validators.

	Returns: A function that takes the user's function as an
	  argument and tests it against all test cases.
	"""
	validators = []
	for test_case in test_cases:
		validators.append(validator_gen(test_case))
	return lambda f: all(validator(f) for validator in validators)

def random_int_if():
	"""Generate a random int IfStatement for use in a CodingProblem"""
	generators = [iter(LessThanIf()), iter(BetweenIf())]
	return next(random.choice(generators))

def random_str_if():
	"""Generate a random str IfStatement for use in a CodingProblem"""
	generators = [iter(UnlessSubstrIf()), iter(IfSubstrIf())]
	return next(random.choice(generators))

class LessThanIf(object):
	"""Generates less than based IfStatements"""
	STATEMENT_TEMPLATE = "if the value is less than {val}"

	def values(self):
		return {
			"val": random.randint(-1000, 1000)
		}

	def __iter__(self):
		while True:
			values = self.values()
			yield IfStatement(
				self.STATEMENT_TEMPLATE.format(**values),
				lambda val: val < values['val'],
				(values["val"] - 1000, values["val"] - 1, values["val"], values["val"] + 1000)
			)

class BetweenIf(object):
	"""Generates between based IfStatements"""
	STATEMENT_TEMPLATE = "if the value is between {val1} and {val2}, inclusive"

	def values(self):
		return {
			"val1": random.randint(-10000, 0),
			"val2": random.randint(1, 10000)
		}

	def __iter__(self):
		while True:
			values = self.values()
			yield IfStatement(
				self.STATEMENT_TEMPLATE.format(**values),
				lambda val: val >= values['val1'] and val <= values['val2'],
				(values["val1"], values["val2"], values["val2"] - values["val1"] // 2, values["val1"] - 1, values["val1"] - 1000, values["val2"] + 1, values["val2"] + 1000)
			)

class UnlessSubstrIf(object):
	"""Generates unless substring based IfStaments"""
	STATEMENT_TEMPLATE = "unless the string contains the substr '{substr}'"

	def values(self):
		return {
			"substr": random_string()
		}

	def __iter__(self):
		while True:
			values = self.values()
			yield IfStatement(
				self.STATEMENT_TEMPLATE.format(**values),
				lambda s: values['substr'] not in s,
				(values['substr'], values['substr'] + "foo", values['substr'][1:], values['substr'][1:]+"1foo")
			)

class IfSubstrIf(object):
	"""Generates if subtring based IfStatements"""
	STATEMENT_TEMPLATE = "if the string contains the substr '{substr}'"

	def values(self):
		return {
			"substr": random_string()
		}

	def __iter__(self):
		while True:
			values = self.values()
			yield IfStatement(
				self.STATEMENT_TEMPLATE.format(**values),
				lambda s: values['substr'] in s,
				(values['substr'], values['substr'] + "foo", values['substr'][1:], values['substr'][1:]+"1foo")
			)

class AppendProblemGenerator(object):
	"""Generates CodingProblems requiring string appending"""
	STATEMENT_TEMPLATE = "Write a function called '{func_name}' that takes one str argument and appends the string '{append}' to it."

	def values(self):
		return {
			"func_name": random_string(),
			"append": random_string()
		}

	def __iter__(self):
		while True:
			values = self.values()
			yield CodingProblem(
				self.STATEMENT_TEMPLATE.format(**values),
				values['func_name'],
				validator(lambda test_case: lambda f: f(test_case) == test_case + values['append'], ["foo"])
			)

class AdditionProblemGenerator(object):
	"""Generates CodingProblems requiring addition"""
	STATEMENT_TEMPLATE = "Write a function called '{func_name}' that takes one integer argument and adds {add1} to it {if_condition}. Otherwise, it should add {add2} to it."

	def values(self):
		return {
			"func_name": random_string(),
			"if_condition": random_int_if(),
			"add1": random.randint(-1000, 1000),
			"add2": random.randint(100000, 1000000),
		}

	def __iter__(self):
		while True:
			values = self.values()
			yield CodingProblem(
				self.STATEMENT_TEMPLATE.format(**values),
				values['func_name'],
				validator(lambda test_case: lambda f: f(test_case) == test_case + (values['add1'] if values['if_condition'].is_true(test_case) else values['add2']), values['if_condition'].test_cases)
			)

class SubstitutionProblemGenerator(object):
	"""Generates coding problems requiring substitution"""
	STATEMENT_TEMPLATE = "Write a function called '{func_name}' that takes one str argument and substitutes all instances of the substr '{substr1}' with '{substr2}' {if_condition}."

	def values(self):
		return {
			"func_name": random_string(),
			"if_condition": random_str_if(),
			"substr1": random_string(),
			"substr2": random_string(),
		}

	def __iter__(self):
		while True:
			values = self.values()
			yield CodingProblem(
				self.STATEMENT_TEMPLATE.format(**values),
				values['func_name'],
				validator(lambda test_case: lambda f: f(test_case) == (test_case.replace(values["substr1"], values["substr2"]) if values['if_condition'].is_true(test_case) else test_case), [case + values['substr1'] for case in values['if_condition'].test_cases])
			)
