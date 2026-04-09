"""
evaluator.py
------------
Evaluation helpers for comparing predicted tumor masks against BraTS ground truth.
"""

import numpy as np


def evaluate_segmentation(pred_mask: np.ndarray, true_mask: np.ndarray) -> dict:
    pred = pred_mask.astype(bool)
    true = true_mask.astype(bool)

    intersection = np.logical_and(pred, true).sum()
    pred_sum = pred.sum()
    true_sum = true.sum()
    union = np.logical_or(pred, true).sum()

    dice = (2.0 * intersection) / (pred_sum + true_sum + 1e-8)
    iou = intersection / (union + 1e-8)
    sensitivity = intersection / (true_sum + 1e-8)
    precision = intersection / (pred_sum + 1e-8)

    return {
      "dice": round(float(dice), 4),
      "iou": round(float(iou), 4),
      "sensitivity": round(float(sensitivity), 4),
      "precision": round(float(precision), 4),
      "predicted_voxels": int(pred_sum),
      "ground_truth_voxels": int(true_sum),
      "intersection_voxels": int(intersection),
    }
