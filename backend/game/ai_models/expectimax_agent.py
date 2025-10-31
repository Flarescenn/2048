from game.base_agent import BaseAgent
import copy
import random

class ExpectimaxAgent(BaseAgent):

    def get_move_sequence(self, game_instance, num_moves, params={}):
        """
        Generates a sequence of moves by repeatedly finding the best move
        using the Expectimax algorithm.
        """
        temp_game = game_instance.clone()
        move_sequence = []

        # Get the search depth from the parameters provided by the consumer.
        # Default to a safe depth of 2 if not specified.
        search_depth = params.get('depth', 2)

        for _ in range(num_moves):
            if temp_game.over:
                break

            # Find the single best move from the current state
            best_move = self.find_best_move(temp_game, search_depth, params)
            
            if best_move:
                # Apply the best move to our main simulation game
                temp_game.move(best_move)
                move_sequence.append({
                    'board': copy.deepcopy(temp_game.board),
                    'score': temp_game.score,
                    'over': temp_game.over,
                    'move_made': best_move
                })
            else:
                # No valid moves could be found
                break
                
        return move_sequence

    def find_best_move(self, game_instance, depth, params):
        """
        Iterates through the 4 possible moves and returns the one
        that yields the highest expectimax score.
        """
        best_score = -float('inf')
        best_move = None

        for move in ['up', 'down', 'left', 'right']:
            sim_game = game_instance.clone()
            
            # If the move is valid and changes the board
            if sim_game.move(move):
                # Calculate the score for this move's outcome.
                # It's now the computer's turn, so is_player_turn is False.
                score = self.expectimax(sim_game, depth - 1, False, params)
                
                if score > best_score:
                    best_score = score
                    best_move = move
        
        return best_move

    def expectimax(self, game_instance, depth, is_player_turn, params):
        """
        The recursive core of the algorithm.
        - If it's the player's turn, it's a MAX node (find the best outcome).
        - If it's the computer's turn, it's a CHANCE node (find the average outcome).
        """
        # Terminal condition: if we've reached max depth or the game is over,
        # we stop searching and evaluate the "goodness" of the current board.
        if depth == 0 or game_instance.over:
            return self.evaluate_board(game_instance.board, params)

        if is_player_turn:
            # --- MAX NODE (Player's Turn) ---
            # We want to find the move that leads to the highest possible score.
            max_score = -float('inf')
            for move in ['up', 'down', 'left', 'right']:
                sim_game = game_instance.clone()
                if sim_game.move(move):
                    score = self.expectimax(sim_game, depth - 1, False, params)
                    max_score = max(max_score, score)
            return max_score
        
        else:
            # --- CHANCE NODE (Computer's Turn) ---
            # We need to calculate the average expected score from the computer's
            # random tile placements.
            total_score = 0
            empty_cells = game_instance.get_empty_cells() # Assumes this helper exists
            num_empty = len(empty_cells)

            if num_empty == 0:
                return -float('inf') # No empty cells, this is a losing path

            # Consider placing a '2' in each empty cell (90% chance)
            for r, c in empty_cells:
                sim_game_2 = game_instance.clone()
                sim_game_2.board[r][c] = 2
                # It's now the player's turn again
                total_score += 0.9 * self.expectimax(sim_game_2, depth - 1, True, params)

            # Consider placing a '4' in each empty cell (10% chance)
            for r, c in empty_cells:
                sim_game_4 = game_instance.clone()
                sim_game_4.board[r][c] = 4
                total_score += 0.1 * self.expectimax(sim_game_4, depth - 1, True, params)

            return total_score / num_empty

    def evaluate_board(self, board, params):
        """
        Calculates a "goodness" score for a board state using weighted heuristics.
        This function is the "brain" of the AI.
        """
        # These weights come from the `params` dictionary, which combines the AI's
        # base_params and the user's custom ai_configs.
        weight_empty = params.get('NEC', 250)
        weight_smoothness = params.get('SMO', 10)
        weight_corner = params.get('LCC', 500)
        
        # Heuristic 1: Number of Empty Cells (NEC)
        empty_cells = sum(row.count(0) for row in board)

        # Heuristic 2: Smoothness (SMO) - measures difference between adjacent tiles
        smoothness = 0
        for r in range(4):
            for c in range(4):
                if board[r][c] != 0:
                    val = board[r][c]
                    # Check cell to the right
                    if c < 3 and board[r][c+1] != 0:
                        smoothness -= abs(val - board[r][c+1])
                    # Check cell below
                    if r < 3 and board[r+1][c] != 0:
                        smoothness -= abs(val - board[r+1][c])
        
        # Heuristic 3: Largest Cell at Corner (LCC)
        max_tile = max(max(row) for row in board)
        corner_bonus = 0
        if board[0][0] == max_tile:
            corner_bonus = max_tile # Reward is proportional to the tile value

        # Final weighted score
        return (
            empty_cells * weight_empty +
            smoothness * weight_smoothness +
            corner_bonus * weight_corner
        )