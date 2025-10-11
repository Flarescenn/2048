import random

class Game2048:
    def __init__(self):
        self.board = [[0]*4 for _ in range(4)]
        self.score = 0
        self.over = False
        self.add_random_tile()
        self.add_random_tile()

    def add_random_tile(self):
        empty = [(r,c) for r in range(4) for c in range(4) if self.board[r][c]==0]
        if not empty:
            return
    
        r,c = random.choice(empty)
        self.board[r][c] = random.choices([2,4],[0.9, 0.1])[0]

    def compress(self, row):
        new_row = [i for i in row if i!=0]
        new_row += [0]*(4- len(new_row))
        return new_row
    
    def merge(self, row):
        for i in range(3):
            if row[i] == row[i+1] and row[i] != 0:
                row[i] *= 2
                self.score += row[i]
                row[i+1] = 0
        return row
    
    def move_left(self):
        moved = False
        new_board = []
        for row in self.board:
            original_row = list(row) # <-- Keep an original copy
            
            compressed = self.compress(original_row)
            merged = self.merge(compressed)
            final = self.compress(merged)
            
            # Check if the final result is different from the original row
            if final != row:
                moved = True
            new_board.append(final)
            
        self.board = new_board
        if moved:
            self.add_random_tile()
        return moved


    def move(self, direction):
            rotated = False
            if direction == 'up':
                self.board = [list(row) for row in zip(*self.board)]
                rotated = True
                moved = self.move_left()
                self.board = [list(row) for row in zip(*self.board)]
            elif direction == 'down':
                # 1. Reverse the rows of the board
                self.board.reverse() 
                # 2. Transpose (Now columns are reversed and become rows)
                self.board = [list(row) for row in zip(*self.board)] 
                
                moved = self.move_left() # Slide down

                # 3. Transpose back
                self.board = [list(row) for row in zip(*self.board)]
                # 4. Reverse the rows back
                self.board.reverse() 
                
                rotated = True 
            elif direction == 'right':
                self.board = [list(reversed(row)) for row in self.board]
                moved = self.move_left()
                self.board = [list(reversed(row)) for row in self.board]
            else:  # left
                moved = self.move_left()
            self.over = self.is_game_over()
            return moved


    def is_game_over(self):
        for r in range(4):
            for c in range(4):
                if self.board[r][c] == 0:
                    return False
                if c < 3 and self.board[r][c] == self.board[r][c+1]:
                    return False
                if r < 3 and self.board[r][c] == self.board[r+1][c]:
                    return False
        return True
    

    def get_state(self):
        return {
            'board':self.board,
            'score':self.score,
            'over':self.over
        }