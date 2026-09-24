import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
from datetime import time

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
    ConfusionMatrixDisplay
)

# Models
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier

# ==========================================
# 1. Load Data & Feature Engineering
# ==========================================
print("--- Loading Dataset ---")
dataset_path = "final_data_set.csv"

if os.path.exists(dataset_path):
    print(f"Loading processed dataset from {dataset_path}...")
    dataset = pd.read_csv(dataset_path)
    X = dataset.drop(columns=["Target"])
    y = dataset["Target"]
else:
    raise FileNotFoundError("final_data_set.csv not found in the project directory!")

# ==========================================
# 2. Train - Test Split
# ==========================================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, shuffle=False, random_state=42
)
print(f"Training samples: {len(X_train)}, Testing samples: {len(X_test)}")

# ==========================================
# 3. Model Definition & Training
# ==========================================
# 1. Logistic Regression (Baseline)
# 2. Decision Tree Classifier (Different Algorithm)
# 3. Random Forest Classifier (Bagging)
# 4. Gradient Boosting Classifier (Boosting)

models = {
    "Logistic Regression": LogisticRegression(max_iter=1000),
    "Decision Tree": DecisionTreeClassifier(max_depth=5, random_state=42),
    "Random Forest (Bagging)": RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42),
    "Gradient Boosting (Boosting)": GradientBoostingClassifier(n_estimators=100, learning_rate=0.05, max_depth=3, random_state=42)
}

results = {}

# ==========================================
# 4. Model Evaluation
# ==========================================
print("\n" + "="*50)
print("           MODEL EVALUATION RESULTS")
print("="*50)

for name, model in models.items():
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    
    results[name] = {
        "Accuracy": acc,
        "Precision": prec,
        "Recall": rec,
        "F1 Score": f1,
        "Model": model
    }
    
    print(f"\n--- {name} ---")
    print(f"Accuracy  : {acc:.4f} ({acc*100:.2f}%)")
    print(f"Precision : {prec:.4f} ({prec*100:.2f}%)")
    print(f"Recall    : {rec:.4f} ({rec*100:.2f}%)")
    print(f"F1 Score  : {f1:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))

# ==========================================
# 5. Confusion Matrix Visualization
# ==========================================
fig, axes = plt.subplots(2, 2, figsize=(12, 10))
axes = axes.flatten()

for idx, (name, res) in enumerate(results.items()):
    model = res["Model"]
    y_pred = model.predict(X_test)
    cm = confusion_matrix(y_test, y_pred)
    
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[idx], cbar=False)
    axes[idx].set_title(f'Confusion Matrix: {name}')
    axes[idx].set_xlabel('Predicted Target')
    axes[idx].set_ylabel('Actual Target')

plt.tight_layout()
plt.savefig('confusion_matrices.png')
print("\nSaved confusion matrices plot to 'confusion_matrices.png'.")

# ==========================================
# 6. Model Comparison Summary
# ==========================================
summary_df = pd.DataFrame(results).T[["Accuracy", "Precision", "Recall", "F1 Score"]]
print("\n" + "="*50)
print("             MODEL COMPARISON SUMMARY")
print("="*50)
print(summary_df.to_string())

# ==========================================
# 7. Save Best Model
# ==========================================
best_model_name = max(results, key=lambda k: results[k]["Accuracy"])
best_model = results[best_model_name]["Model"]

print(f"\nSaving model ({best_model_name}) to NY_Predict.pkl...")
joblib.dump(best_model, "NY_Predict.pkl")
print("Model saved successfully!")
