
class GameOverException(Exception):
	def __init__(self, loser, msg):
		self.loser = loser
		super(self, GameOverException).__init__(msg)

class IllegalStateException(Exception):
	pass

class IllegalArgumentException(Exception):
	pass


