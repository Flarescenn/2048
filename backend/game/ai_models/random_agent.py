from game.base_agent import BaseAgent
import random

class RandomAgent(BaseAgent):
    def get_move(self, board):
        possible_moves = ['up', 'down', 'left', 'right']
        return random.choice(possible_moves)