class BaseAgent:
    def __init__(self, params=None):
        self.params = params if params is not None else {}

    def get_move(self, board):
        raise NotImplementedError