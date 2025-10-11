

import os
import importlib
import inspect
from game.base_agent import BaseAgent 

AGENTS = {}
current_dir = os.path.dirname(os.path.abspath(__file__))
ai_folder = os.path.join(current_dir, "ai_models") 

# Check if the folder exists before proceeding
if not os.path.isdir(ai_folder):
    # Handle error or use an empty agent list
    print(f"Warning: AI models directory not found at {ai_folder}")

# Construct the base module path for importlib
# This assumes the ai_models directory is correctly named 'ai_models' under the 'game' package
base_module_path = "game.ai_models" 

for file in os.listdir(ai_folder):
    if file.endswith(".py") and file != "__init__.py":
        
        # Construct the correct module name based on package structure
        module_name = f"{base_module_path}.{file[:-3]}" 
        
        try:
            module = importlib.import_module(module_name)
            
            for name, obj in inspect.getmembers(module):
                if inspect.isclass(obj) and issubclass(obj, BaseAgent) and obj != BaseAgent:
                    AGENTS[name.lower()] = obj
                    
        except ImportError as e:
            # Catch specific errors if an agent file can't be imported
            print(f"Error loading agent {module_name}: {e}")