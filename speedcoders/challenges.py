import random

import word_generator

WORD_GENERATOR = word_generator.load("word_gen4.pickle")

class CodingProblem(object):
	def __init__(self, statement, expected_func, validator):
		self.statement = statement
		self.expected_func = expected_func
		self.validator = validator

	def validate(self, solution):
		try:
			exec solution
			return self.validator(locals()[self.expected_func])
		except:
			import traceback
			traceback.print_exc()
			return False

class IfStatement(object):
	def __init__(self, statement, is_true, test_cases):
		self.statement = statement
		self.is_true = is_true
		self.test_cases = test_cases

	def __str__(self):
		return self.statement

def random_string():
	return WORD_GENERATOR.generate_word()

def validator(validator_gen, test_cases):
	validators = []
	for test_case in test_cases:
		validators.append(validator_gen(test_case))
	return lambda f: all(validator(f) for validator in validators)

def random_int_if():
	generators = [iter(LessThanIf()), iter(BetweenIf())]
	return next(random.choice(generators))

def random_str_if():
	generators = [iter(UnlessSubstrIf()), iter(IfSubstrIf())]
	return next(random.choice(generators))

class LessThanIf(object):
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
