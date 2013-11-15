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
		else:
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


class CodeHandler(webapp2.RequestHandler):
	def get(self):
		user = self.login()

		try:
			challenge = self.GAME.challenge(user.nickname())
		except exc.IllegalStateException as ise:
			raise webapp2.HTTPConflict(str(ise))

		self.write_json(challenge)

	def post(self, seat_num):
		user = self.login()

		post_data = json.loads(self.request.body)

		try:
			if 'solution' in post_data:
				result = self.GAME.submit_answer(user.nickname(), post_data['solution'])
			else:
				raise webapp2.HTTPBadRequest("missing parameter 'solution'")
		except exc.IllegalStateException as ise:
			raise webapp2.HTTPConflict(str(ise))

		self.write_json(result)


class SeatHandler(webapp2.RequestHandler):
	def post(self, seat_num):
		user = self.login()

		post_data = json.loads(self.request.body)

		try:
			if "action" in post_data:
				if post_data['action'] == 'sit':
					self.GAME.add_user(user.nickname(), int(seat_num))
				elif post_data['action'] == 'stand':
					self.GAME.remove_user(user.nickname())
				else:
					raise webapp2.HTTPBadRequest("action must be 'sit' or 'stand'")
			else:
				raise webapp2.HTTPBadRequest("missing parameter 'action'")
		except exc.IllegalStateException as ise:
			raise webapp2.HTTPConflict(str(ise))

		self.write_json(json.dumps({"result": "ok"}))


class MainHandler(webapp2.RequestHandler):
	def get(self):
		self.login()

		self.write_json(self.GAME.to_json())

	def post(self):
		self.login()

		post_data = json.loads(self.request.body)

		try:
			if 'action' in post_data:
				if post_data['action'] == 'start':
					self.GAME.play()
				else:
					raise webapp2.HTTPBadRequest("action must be 'start'")
			else:
				raise webapp2.HTTPBadRequest("missing parameter 'action'")
		except exc.IllegalStateException as ise:
			raise webapp2.HTTPConflict(str(ise))

app = webapp2.WSGIApplication([
	('/code', CodeHandler),
	('/seats/(\d+)', SeatHandler),
	('/', MainHandler),
], debug=True)
