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
import game

from google.appengine.api import users
import webapp2

GAME = game.Table(seats=4, tokens=2)

def login(handler):
	user = users.get_current_user()
	if user:
		return user
	else:
		handler.redirect(users.create_login_url(handler.request.uri))

class CodeHandler(webapp2.RequestHandler):
	def get(self, seat_num):
		pass

	def post(self, seat_num):
		pass

class SeatHandler(webapp2.RequestHandler):
	def post(self, seat_num):
		user = login(self)

		post_data = dict(self.request.POST)

		if "sit" in post_data:
			self.GAME.add_user(user.nickname(), int(post_data['sit']))
		elif "stand" in post_data:
			self.GAME.remove_user(user.nickname())

class MainHandler(webapp2.RequestHandler):
	def get(self):
		login(self)

		self.response.write(self.GAME.render())

app = webapp2.WSGIApplication([
	('/seats/(\d+)/code', CodeHandler),
	('/seats/(\d+)', SeatHandler),
	('/', MainHandler),
], debug=True)
