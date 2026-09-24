import sys
import os

# Add root project folder to sys.path so app.py and NY_Predict.pkl can be found
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
