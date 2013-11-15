#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
import exceptions as exc
import game

import json

from google.appengine.api import users
import webapp2

GAME = game.Table(seats=4, tokens=2)

class BaseHandler(webapp2.RequestHandler):
	def handle_exception(self, exception, debug):
		if isinstance(exception, webapp2.HTTPException):
			self.response.write(str(exception))
			self.response.set_status(exception.code)
		elif isinstance(exception, exc.IllegalArgumentException):
			# Bad Request error
			self.response.write(str(exception))
			self.response.set_status(400)
		elif isinstance(exception, exc.IllegalStateException):
			# Conflict error
			self.response.write(str(exception))
			self.response.set_status(409)
		else:
			# Internal Server errror
			self.response.write("Something went wrong.")
			self.response.set_status(500)

	def login(self):
		user = users.get_current_user()
		if user:
			return user
		else:
			self.redirect(users.create_login_url(self.request.uri))

	def write_json(self, json_str):
		self.response.write(json_str)
		self.response.headers['Content-Type'] = 'application/json'


class CodeHandler(BaseHandler):
	def get(self):
		user = self.login()

		challenge = self.GAME.get_challenge(user.nickname())

		self.write_json(challenge)

	def post(self, seat_num):
		user = self.login()

		post_data = json.loads(self.request.body)

		if 'solution' in post_data:
			result = self.GAME.submit_answer(user.nickname(), post_data['solution'])
		else:
			raise webapp2.HTTPBadRequest("missing parameter 'solution'")

		self.write_json(result)


class SeatHandler(BaseHandler):
	def post(self, seat_num):
		user = self.login()

		post_data = json.loads(self.request.body)

		if "action" in post_data:
			if post_data['action'] == 'sit':
				seat = self.GAME.add_user(user.nickname(), int(seat_num))
			elif post_data['action'] == 'stand':
				seat = self.GAME.remove_user(user.nickname())
			else:
				raise webapp2.HTTPBadRequest("action must be 'sit' or 'stand'")
		else:
			raise webapp2.HTTPBadRequest("missing parameter 'action'")

		self.write_json(seat)


class MainHandler(BaseHandler):
	def get(self):
		self.login()

		self.write_json(self.GAME.to_json())

	def post(self):
		self.login()

		post_data = json.loads(self.request.body)

		if 'action' in post_data:
			if post_data['action'] == 'start':
				self.GAME.play()
			else:
				raise webapp2.HTTPBadRequest("action must be 'start'")
		else:
			raise webapp2.HTTPBadRequest("missing parameter 'action'")

app = webapp2.WSGIApplication([
	('/code', CodeHandler),
	('/seats/(\d+)', SeatHandler),
	('/', MainHandler),
], debug=True)
